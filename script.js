// Performance-optimized JavaScript with modern features

// Use passive event listeners for better scroll performance
const addPassiveEventListener = (element, event, handler) => {
  element.addEventListener(event, handler, { passive: true });
};

// Debounce function for performance optimization
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Optimized DOM ready function
const ready = (callback) => {
  if (document.readyState !== 'loading') {
    callback();
  } else {
    document.addEventListener('DOMContentLoaded', callback);
  }
};

// Main application logic
ready(() => {
  // Remove loading class for smooth fade-in
  document.body.classList.remove('loading');
  document.body.classList.add('loaded');

  // Cache DOM elements for better performance
  const form = document.getElementById('contact-form');
  const submitBtn = document.getElementById('submit-btn');
  const navLinks = document.querySelectorAll('nav a[href^="#"]');

  // Smooth scrolling for navigation links
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').substring(1);
      const targetElement = document.getElementById(targetId);
      
      if (targetElement) {
        // Use modern smooth scrolling
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
        
        // Update URL without triggering navigation
        history.pushState(null, null, `#${targetId}`);
      }
    });
  });

  // Enhanced form validation and submission
  if (form) {
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const messageInput = document.getElementById('message');

    // Real-time validation
    const validateField = (field, validator) => {
      const isValid = validator(field.value);
      field.classList.toggle('invalid', !isValid);
      return isValid;
    };

    // Validation rules
    const validators = {
      name: (value) => value.trim().length >= 2,
      email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      message: (value) => value.trim().length >= 10
    };

    // Add input listeners with debouncing for performance
    nameInput.addEventListener('input', debounce(() => {
      validateField(nameInput, validators.name);
    }, 300));

    emailInput.addEventListener('input', debounce(() => {
      validateField(emailInput, validators.email);
    }, 300));

    messageInput.addEventListener('input', debounce(() => {
      validateField(messageInput, validators.message);
    }, 300));

    // Form submission with loading state
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Validate all fields
      const isNameValid = validateField(nameInput, validators.name);
      const isEmailValid = validateField(emailInput, validators.email);
      const isMessageValid = validateField(messageInput, validators.message);

      if (!isNameValid || !isEmailValid || !isMessageValid) {
        // Focus first invalid field
        const firstInvalid = form.querySelector('.invalid');
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      // Show loading state
      submitBtn.disabled = true;
      submitBtn.querySelector('span:first-child').style.display = 'none';
      submitBtn.querySelector('.loading-spinner').style.display = 'inline-block';

      try {
        // Simulate form submission (replace with actual endpoint)
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Success feedback
        showNotification('Thank you! Your message has been sent successfully.', 'success');
        form.reset();
        
        // Reset field validation states
        [nameInput, emailInput, messageInput].forEach(field => {
          field.classList.remove('invalid');
        });

      } catch (error) {
        showNotification('Sorry, there was an error sending your message. Please try again.', 'error');
      } finally {
        // Reset button state
        submitBtn.disabled = false;
        submitBtn.querySelector('span:first-child').style.display = 'inline';
        submitBtn.querySelector('.loading-spinner').style.display = 'none';
      }
    });
  }

  // Notification system
  const showNotification = (message, type = 'info') => {
    // Remove existing notifications
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <span>${message}</span>
      <button class="notification-close" aria-label="Close">&times;</button>
    `;

    // Add styles
    Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '1rem 1.5rem',
      borderRadius: '6px',
      color: '#fff',
      backgroundColor: type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#3498db',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: '1000',
      transform: 'translateX(100%)',
      transition: 'transform 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      maxWidth: '400px'
    });

    document.body.appendChild(notification);

    // Animate in
    requestAnimationFrame(() => {
      notification.style.transform = 'translateX(0)';
    });

    // Auto-dismiss
    const dismiss = () => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => notification.remove(), 300);
    };

    // Close button
    notification.querySelector('.notification-close').addEventListener('click', dismiss);

    // Auto-dismiss after 5 seconds
    setTimeout(dismiss, 5000);
  };

  // Intersection Observer for scroll animations
  if ('IntersectionObserver' in window) {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }
      });
    }, observerOptions);

    // Observe sections for scroll animations
    document.querySelectorAll('section').forEach(section => {
      section.style.opacity = '0';
      section.style.transform = 'translateY(20px)';
      section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      observer.observe(section);
    });
  }

  // Performance monitoring (optional)
  if ('performance' in window && 'PerformanceObserver' in window) {
    // Monitor Core Web Vitals
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'largest-contentful-paint') {
          console.log('LCP:', entry.startTime);
        }
        if (entry.entryType === 'first-input') {
          console.log('FID:', entry.processingStart - entry.startTime);
        }
        if (entry.entryType === 'layout-shift') {
          if (!entry.hadRecentInput) {
            console.log('CLS:', entry.value);
          }
        }
      });
    });

    try {
      observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
    } catch (e) {
      // Silently handle unsupported entry types
    }
  }
});

// Preload critical resources
const preloadCriticalResources = () => {
  const criticalResources = [
    'styles.min.css',
    // Add other critical resources here
  ];

  criticalResources.forEach(resource => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = resource;
    link.as = resource.endsWith('.css') ? 'style' : 'script';
    document.head.appendChild(link);
  });
};

// Initialize performance optimizations
preloadCriticalResources();
