// ═══════════ AUTH PAGE UI TOGGLE ═══════════

const authContainer = document.getElementById('authContainer');
const loginToggle = document.getElementById('loginToggle');
const registerToggle = document.getElementById('registerToggle');

// Desktop toggle buttons (sliding overlay)
if (registerToggle) {
    registerToggle.addEventListener('click', () => {
        authContainer.classList.add('active');
    });
}

if (loginToggle) {
    loginToggle.addEventListener('click', () => {
        authContainer.classList.remove('active');
    });
}

// Mobile switch link
const mobileSwitchLink = document.getElementById('mobileSwitchLink');
const mobileSwitchText = document.getElementById('mobileSwitchText');

if (mobileSwitchLink) {
    mobileSwitchLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (authContainer.classList.contains('active')) {
            authContainer.classList.remove('active');
            mobileSwitchLink.textContent = 'Sign Up';
            mobileSwitchText.textContent = "Don't have an account?";
        } else {
            authContainer.classList.add('active');
            mobileSwitchLink.textContent = 'Sign In';
            mobileSwitchText.textContent = "Already have an account?";
        }
    });
}

// If URL has ?mode=signup, show signup panel
if (window.location.search.includes('mode=signup')) {
    authContainer.classList.add('active');
    if (mobileSwitchLink) {
        mobileSwitchLink.textContent = 'Sign In';
        mobileSwitchText.textContent = "Already have an account?";
    }
}
