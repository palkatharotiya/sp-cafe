// ═══════════ NAVBAR SCROLL EFFECT ═══════════
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
});

// ═══════════ MOBILE NAV TOGGLE ═══════════
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');

hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navLinks.classList.toggle('open');
});

// Close nav on link click
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navLinks.classList.remove('open');
    });
});

// ═══════════ ACTIVE NAV LINK ON SCROLL ═══════════
const sections = document.querySelectorAll('section[id]');
window.addEventListener('scroll', () => {
    const scrollY = window.scrollY + 100;
    sections.forEach(section => {
        const top = section.offsetTop;
        const height = section.offsetHeight;
        const id = section.getAttribute('id');
        const link = document.querySelector(`.nav-link[href="#${id}"]`);
        if (link) {
            link.classList.toggle('active', scrollY >= top && scrollY < top + height);
        }
    });
});

// ═══════════ MENU TABS ═══════════
const menuTabs = document.querySelectorAll('.menu-tab');
const menuCards = document.querySelectorAll('.menu-card');

menuTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        menuTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const category = tab.dataset.category;
        menuCards.forEach(card => {
            if (card.dataset.category === category) {
                card.classList.remove('hidden');
                card.style.animation = 'fadeInUp 0.4s ease forwards';
            } else {
                card.classList.add('hidden');
            }
        });
    });
});

// ═══════════ SWIPER CAROUSEL ═══════════
const reviewSwiper = new Swiper('.reviewSwiper', {
    slidesPerView: 1,
    spaceBetween: 24,
    loop: true,
    autoplay: { delay: 4000, disableOnInteraction: false },
    pagination: { el: '.swiper-pagination', clickable: true },
    breakpoints: {
        640: { slidesPerView: 2 },
        1024: { slidesPerView: 3 },
    }
});

// ═══════════ SLOT LOADING ═══════════
const dateInput = document.getElementById('bookDate');
const slotSelect = document.getElementById('bookSlot');
const slotHint = document.getElementById('slotHint');

// Set min date to today
if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.setAttribute('min', today);
}

// Load slots when date changes
dateInput.addEventListener('change', async () => {
    const date = dateInput.value;
    if (!date) return;

    slotSelect.disabled = true;
    slotSelect.innerHTML = '<option value="">Loading slots...</option>';
    slotHint.textContent = '';

    try {
        const res = await fetch(`/api/slots?date=${date}`);
        const slots = await res.json();

        slotSelect.innerHTML = '<option value="">Select a time slot</option>';

        slots.forEach(slot => {
            const opt = document.createElement('option');
            opt.value = slot.slotId;
            if (slot.isFull) {
                opt.textContent = `${slot.label} — FULL`;
                opt.disabled = true;
                opt.style.color = '#999';
            } else {
                opt.textContent = `${slot.label} (${slot.remaining} seats left)`;
            }
            slotSelect.appendChild(opt);
        });

        slotSelect.disabled = false;
    } catch (error) {
        slotSelect.innerHTML = '<option value="">Error loading slots</option>';
    }
});

// Show remaining seats when slot is selected
slotSelect.addEventListener('change', () => {
    const selected = slotSelect.options[slotSelect.selectedIndex];
    if (selected && selected.value) {
        slotHint.textContent = selected.textContent;
        slotHint.style.color = '#4caf50';
    } else {
        slotHint.textContent = '';
    }
});

// ═══════════ BOOKING FORM SUBMISSION ═══════════
const bookForm = document.getElementById('bookForm');
const formResponse = document.getElementById('formResponse');
const bookSubmitBtn = document.getElementById('bookSubmitBtn');

bookForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    bookSubmitBtn.disabled = true;
    bookSubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Booking...';

    const formData = {
        name: document.getElementById('bookName').value,
        email: document.getElementById('bookEmail').value,
        phone: document.getElementById('bookPhone').value,
        date: document.getElementById('bookDate').value,
        slot: document.getElementById('bookSlot').value,
        partySize: document.getElementById('bookPartySize').value,
        message: document.getElementById('bookMessage').value
    };

    try {
        const response = await fetch('/book', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        // If not logged in, redirect to login page
        if (response.status === 401 && result.redirect) {
            formResponse.textContent = result.message + ' Redirecting to login...';
            formResponse.className = 'form-response error';
            setTimeout(() => { window.location.href = result.redirect; }, 1500);
            return;
        }

        formResponse.textContent = result.message;
        formResponse.className = 'form-response ' + (result.success ? 'success' : 'error');

        if (result.success) {
            bookForm.reset();
            slotSelect.disabled = true;
            slotSelect.innerHTML = '<option value="">← Pick a date first</option>';
            slotHint.textContent = '';
        }
    } catch (error) {
        formResponse.textContent = 'Network error. Please try again.';
        formResponse.className = 'form-response error';
    } finally {
        bookSubmitBtn.disabled = false;
        bookSubmitBtn.innerHTML = '<i class="fas fa-calendar-check"></i> Reserve My Table';
    }
});

// ═══════════ SCROLL REVEAL ANIMATION ═══════════
const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.animation = 'fadeInUp 0.6s ease forwards';
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

document.querySelectorAll('.about-card, .menu-card, .review-card, .book-form').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    observer.observe(el);
});
