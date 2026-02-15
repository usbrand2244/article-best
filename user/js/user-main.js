import { auth, db, googleProvider, ADMIN_EMAIL } from '../../js/firebase-config.js';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    onAuthStateChanged,
    signOut
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
    collection,
    addDoc,
    getDocs,
    query,
    orderBy,
    limit,
    where,
    onSnapshot,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Global state
let currentUser = null;
let currentProfilePicture = null;

// DOM Elements
const loginModal = document.getElementById('loginModal');
const signupModal = document.getElementById('signupModal');
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');
const closeLoginModal = document.getElementById('closeLoginModal');
const closeSignupModal = document.getElementById('closeSignupModal');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const googleLoginBtn = document.getElementById('googleLoginBtn');
const googleSignupBtn = document.getElementById('googleSignupBtn');
const switchToSignup = document.getElementById('switchToSignup');
const switchToLogin = document.getElementById('switchToLogin');
const userProfile = document.getElementById('userProfile');
const profileImg = document.getElementById('profileImg');
const logoutBtn = document.getElementById('logoutBtn');
const searchInput = document.getElementById('searchInput');
const categoriesGrid = document.getElementById('categoriesGrid');
const articlesGrid = document.getElementById('articlesGrid');
const adContainer = document.getElementById('adContainer');
const profilePictureInput = document.getElementById('profilePicture');
const filePreview = document.getElementById('filePreview');

// Breaking News Elements
const breakingNewsSection = document.getElementById('breakingNewsSection');
const breakingNewsText = document.getElementById('breakingNewsText');
const closeBreakingNews = document.getElementById('closeBreakingNews');

// Load Breaking News
async function loadBreakingNews() {
    try {
        // Simple query without where clause to avoid permission issues
        const q = query(collection(db, 'breakingNews'), orderBy('createdAt', 'desc'), limit(1));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
            const breakingNews = snapshot.docs[0].data();
            // Only show if isActive is not explicitly false
            if (breakingNews.isActive !== false) {
                breakingNewsText.textContent = breakingNews.message || 'No breaking news available';
                breakingNewsSection.style.display = 'block';
            }
        }
    } catch (error) {
        console.error('Error loading breaking news:', error);
        breakingNewsSection.style.display = 'none';
    }
}

// Close Breaking News
closeBreakingNews?.addEventListener('click', () => {
    breakingNewsSection.style.display = 'none';
});

// Modal Functions
loginBtn?.addEventListener('click', () => {
    loginModal.classList.add('active');
});

signupBtn?.addEventListener('click', () => {
    signupModal.classList.add('active');
});

closeLoginModal?.addEventListener('click', () => {
    loginModal.classList.remove('active');
});

closeSignupModal?.addEventListener('click', () => {
    signupModal.classList.remove('active');
});

switchToSignup?.addEventListener('click', (e) => {
    e.preventDefault();
    loginModal.classList.remove('active');
    signupModal.classList.add('active');
});

switchToLogin?.addEventListener('click', (e) => {
    e.preventDefault();
    signupModal.classList.remove('active');
    loginModal.classList.add('active');
});

// Close modal on outside click
window.addEventListener('click', (e) => {
    if (e.target === loginModal) {
        loginModal.classList.remove('active');
    }
    if (e.target === signupModal) {
        signupModal.classList.remove('active');
    }
});

// Profile Picture Preview
profilePictureInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            currentProfilePicture = e.target.result;
            filePreview.innerHTML = `<img src="${e.target.result}" alt="Preview" style="max-width: 200px; border-radius: 8px;">`;
        };
        reader.readAsDataURL(file);
    }
});

// Auth State Management
onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    
    if (user) {
        // Check if user is blocked
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().isBlocked) {
            alert('Your account has been blocked. You cannot access the site.');
            await signOut(auth);
            window.close();
            return;
        }
        
        // Show user profile, hide login/signup buttons
        if (userProfile) userProfile.style.display = 'block';
        if (profileImg) profileImg.src = user.photoURL || 'https://picsum.photos/seed/default/40/40.jpg';
        if (loginBtn) loginBtn.style.display = 'none';
        if (signupBtn) signupBtn.style.display = 'none';
        
        // Load user-specific content
        loadUserContent();
    } else {
        // Show login/signup buttons, hide user profile
        if (userProfile) userProfile.style.display = 'none';
        if (loginBtn) loginBtn.style.display = 'block';
        if (signupBtn) signupBtn.style.display = 'block';
    }
});

// Login Form
loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
        loginModal.classList.remove('active');
        showToast('Login successful!', 'success');
    } catch (error) {
        console.error('Login error:', error);
        showToast(error.message, 'error');
    }
});

// Signup Form
signupForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Create user profile in Firestore
        await setDoc(doc(db, 'users', user.uid), {
            name: name,
            email: email,
            role: 'user',
            createdAt: serverTimestamp(),
            isBlocked: false
        });
        
        signupModal.classList.remove('active');
        showToast('Account created successfully!', 'success');
    } catch (error) {
        console.error('Signup error:', error);
        showToast(error.message, 'error');
    }
});

// Google Login
googleLoginBtn?.addEventListener('click', async () => {
    try {
        await signInWithPopup(auth, googleProvider);
        loginModal.classList.remove('active');
        showToast('Login successful!', 'success');
    } catch (error) {
        console.error('Google login error:', error);
        showToast(error.message, 'error');
    }
});

// Google Signup
googleSignupBtn?.addEventListener('click', async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        
        // Check if user exists in Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists()) {
            // Create new user profile
            await setDoc(doc(db, 'users', user.uid), {
                name: user.displayName || 'User',
                email: user.email,
                role: 'user',
                createdAt: serverTimestamp(),
                isBlocked: false
            });
        }
        
        signupModal.classList.remove('active');
        showToast('Account created successfully!', 'success');
    } catch (error) {
        console.error('Google signup error:', error);
        showToast(error.message, 'error');
    }
});

// Logout
logoutBtn?.addEventListener('click', async () => {
    try {
        await signOut(auth);
        showToast('Logged out successfully!', 'success');
    } catch (error) {
        console.error('Logout error:', error);
        showToast(error.message, 'error');
    }
});

// Load User Content
async function loadUserContent() {
    loadBreakingNews();
    loadCategories();
    loadArticles();
    loadAds();
    loadStats();
}

// Load Categories
async function loadCategories() {
    if (!categoriesGrid) return;
    
    const categories = [
        { name: 'Technology', icon: '💻', color: '#6366f1' },
        { name: 'Business', icon: '💼', color: '#ec4899' },
        { name: 'Lifestyle', icon: '🌟', color: '#f59e0b' },
        { name: 'Health', icon: '🏥', color: '#10b981' },
        { name: 'Education', icon: '📚', color: '#8b5cf6' },
        { name: 'Entertainment', icon: '🎬', color: '#ef4444' }
    ];
    
    let categoriesHTML = '';
    categories.forEach(category => {
        categoriesHTML += `
            <div class="category-card" onclick="filterByCategory('${category.name}')">
                <div class="category-icon" style="color: ${category.color}; font-size: 3rem; margin-bottom: 1rem;">
                    ${category.icon}
                </div>
                <h3>${category.name}</h3>
                <p>Explore ${category.name.toLowerCase()} articles</p>
            </div>
        `;
    });
    
    categoriesGrid.innerHTML = categoriesHTML;
}

// Load Articles
let currentLimit = 6;
async function loadArticles(limitCount = 6) {
    if (!articlesGrid) return;

    console.log('Loading articles with limit:', limitCount);
    articlesGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem;">Loading articles...</div>';

    try {
        // Simple query without compound where to avoid index requirement
        const q = query(
            collection(db, 'articles'),
            orderBy('createdAt', 'desc'),
            limit(limitCount)
        );

        console.log('Executing query:', q);
        const snapshot = await getDocs(q);
        console.log('Query result:', snapshot);

        let articlesHTML = '';
        snapshot.forEach((docSnap) => {
            const article = docSnap.data();
            const articleId = docSnap.id;
            
            // Only show active articles
            if (article.isActive !== false) {
                console.log('Processing article:', article.title);
                articlesHTML += createArticleCard(article, articleId);
            }
        });

        console.log('Setting articles grid HTML');
        articlesGrid.innerHTML = articlesHTML || '<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--text-secondary);">No active articles found</div>';
        
        // Add event delegation for article clicks
        articlesGrid.onclick = function(e) {
            const articleCard = e.target.closest('.article-card');
            if (articleCard) {
                const articleId = articleCard.dataset.articleId;
                console.log('Article clicked:', articleId);
                viewArticle(articleId);
            }
        };
    } catch (error) {
        console.error('Error loading articles:', error);
        articlesGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--danger-color);">Error loading articles</div>';
    }
}

// Create Article Card
function createArticleCard(article, articleId) {
    const excerpt = article.content.replace(/<[^>]*>/g, '').substring(0, 150) + '...';
    const category = article.category || 'General';
    const date = article.createdAt?.toDate().toLocaleDateString() || 'Unknown';
    
    return `
        <div class="article-card" data-article-id="${articleId}">
            <img src="${article.imageURL || 'https://picsum.photos/seed/article/400/250.jpg'}" alt="${article.title}" class="article-image">
            <div class="article-content">
                <div class="article-meta">
                    <span class="article-category">${category}</span>
                    <span class="article-date">${date}</span>
                </div>
                <h3 class="article-title">${article.title}</h3>
                <p class="article-excerpt">${excerpt}</p>
                <div class="article-footer">
                    <span class="article-stats">
                        <span>👁 ${article.views || 0} views</span>
                    </span>
                </div>
            </div>
        </div>
    `;
}

// View Article
window.viewArticle = function(articleId) {
    console.log('viewArticle called with ID:', articleId);
    console.log('Navigating to:', `../../article.html?id=${articleId}`);
    window.location.href = `../../article.html?id=${articleId}`;
};

// Load Ads
async function loadAds() {
    if (!adContainer) return;

    try {
        const q = query(collection(db, 'ads'), where('isActive', '==', true), limit(5));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            adContainer.innerHTML = '<p style="color: var(--text-muted);">Advertisement space</p>';
            return;
        }

        let adHTML = '';
        snapshot.forEach((docSnap) => {
            const ad = docSnap.data();
            const imageSrc = ad.imageUrl || ad.imageBase64 || ad.mediaURL || '';
            
            adHTML += `
                <div class="ad-item" style="margin-bottom: 20px; text-align: center;">
                    <div class="ad-content" style="background: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #e9ecef;">
                        ${imageSrc ?
                            `<a href="${ad.link || '#'}" target="_blank" style="display: block;">
                                <img src="${imageSrc}" alt="${ad.title || 'Advertisement'}" style="max-width: 100%; height: auto; border-radius: 4px;">
                            </a>` :
                            `<p style="color: #6c757d; margin: 0;">${ad.title || 'Advertisement'}</p>`
                        }
                    </div>
                </div>
            `;
        });

        adContainer.innerHTML = adHTML;
    } catch (error) {
        console.error('Error loading ads:', error);
        adContainer.innerHTML = '<p style="color: var(--text-muted);">No ads available</p>';
    }
}

// Load Stats
async function loadStats() {
    try {
        const articlesSnapshot = await getDocs(collection(db, 'articles'));
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const authorsQuery = query(collection(db, 'users'), where('role', '==', 'author'));
        const authorsSnapshot = await getDocs(authorsQuery);

        const articleCountEl = document.getElementById('articleCount');
        const authorCountEl = document.getElementById('authorCount');

        if (articleCountEl) animateCounter(articleCountEl, articlesSnapshot.size);
        if (authorCountEl) animateCounter(authorCountEl, authorsSnapshot.size);
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Animate Counter
function animateCounter(element, target) {
    let current = 0;
    const increment = target / 50;
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        element.textContent = Math.floor(current).toLocaleString();
    }, 30);
}

// Search functionality
searchInput?.addEventListener('input', async (e) => {
    const searchTerm = e.target.value.toLowerCase();
    
    if (searchTerm.length < 2) {
        loadArticles();
        return;
    }
    
    try {
        // Simple query without where clause to avoid index requirement
        const q = query(
            collection(db, 'articles'),
            orderBy('createdAt', 'desc'),
            limit(50)
        );
        
        const snapshot = await getDocs(q);
        
        let articlesHTML = '';
        let foundArticles = false;
        
        snapshot.forEach((docSnap) => {
            const article = docSnap.data();
            const articleId = docSnap.id;
            
            // Only search in active articles
            if (article.isActive !== false) {
                // Search in title and content
                const titleMatch = article.title?.toLowerCase().includes(searchTerm);
                const contentMatch = article.content?.toLowerCase().includes(searchTerm);
                const categoryMatch = article.category?.toLowerCase().includes(searchTerm);
                
                if (titleMatch || contentMatch || categoryMatch) {
                    articlesHTML += createArticleCard(article, articleId);
                    foundArticles = true;
                }
            }
        });
        
        articlesGrid.innerHTML = articlesHTML || '<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--text-secondary);">No articles found</div>';
        
        // Add event delegation for article clicks
        articlesGrid.onclick = function(e) {
            const articleCard = e.target.closest('.article-card');
            if (articleCard) {
                const articleId = articleCard.dataset.articleId;
                console.log('Article clicked via search:', articleId);
                viewArticle(articleId);
            }
        };
    } catch (error) {
        console.error('Search error:', error);
        articlesGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--danger-color);">Error searching articles</div>';
    }
});

// Filter by Category
window.filterByCategory = async function(categoryName) {
    console.log('filterByCategory called with:', categoryName);
    try {
        // Simple query without compound where to avoid index requirement
        const q = query(
            collection(db, 'articles'),
            orderBy('createdAt', 'desc'),
            limit(50)
        );
        
        const snapshot = await getDocs(q);
        console.log('Total active articles found:', snapshot.size);
        
        let articlesHTML = '';
        let foundArticles = false;
        
        snapshot.forEach((docSnap) => {
            const article = docSnap.data();
            const articleId = docSnap.id;
            
            // Only show active articles and check category match
            if (article.isActive !== false) {
                // Check if article category matches (case insensitive)
                const articleCategory = article.category || 'General';
                const matchesCategory = articleCategory.toLowerCase() === categoryName.toLowerCase();
                
                console.log('Article:', article.title, 'Category:', articleCategory, 'Matches:', matchesCategory);
                
                if (matchesCategory) {
                    articlesHTML += createArticleCard(article, articleId);
                    foundArticles = true;
                }
            }
        });
        
        console.log('Found matching articles:', foundArticles);
        
        if (foundArticles) {
            articlesGrid.innerHTML = articlesHTML;
        } else {
            articlesGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--text-secondary);">No articles found in ${categoryName}</div>`;
        }
        
        // Add event delegation for article clicks
        articlesGrid.onclick = function(e) {
            const articleCard = e.target.closest('.article-card');
            if (articleCard) {
                const articleId = articleCard.dataset.articleId;
                console.log('Article clicked via category filter:', articleId);
                viewArticle(articleId);
            }
        };
        
        // Scroll to articles section
        document.querySelector('.articles-section').scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('Category filter error:', error);
        articlesGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 2rem; color: var(--danger-color);">Error loading category articles</div>';
    }
};

// Load More
const loadMoreBtn = document.getElementById('loadMoreBtn');
loadMoreBtn?.addEventListener('click', () => {
    currentLimit += 6;
    loadArticles(currentLimit);
});

// Explore Button
document.getElementById('exploreBtn')?.addEventListener('click', () => {
    window.location.href = '../../articles.html';
});

// Mobile Menu Toggle
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const navLinks = document.querySelector('.nav-links');

mobileMenuBtn?.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    mobileMenuBtn.classList.toggle('active');
});

// Close mobile menu when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav-container') && navLinks.classList.contains('active')) {
        navLinks.classList.remove('active');
        mobileMenuBtn.classList.remove('active');
    }
});

// Toast notification function
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('hide');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (!currentUser) {
        loadBreakingNews();
        loadCategories();
        loadArticles();
        loadAds();
        loadStats();
    }
});
