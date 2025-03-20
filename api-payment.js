// api-payment.js
const urlParams = new URLSearchParams(window.location.search);

// Update the payment success handler
if (urlParams.get('payment_status') === 'success') {
    // Get the plan from localStorage (saved before redirect)
    const planType = localStorage.getItem('selectedPlan');
    
    // Add credits based on plan and check the payment link used
    let creditAmount = 10;
    const paymentSource = urlParams.get('payment_source') || '';
    
    if (paymentSource.includes('pdX51NlsWQG0xc14FX9AM')) {
        // This was the lower-priced payment link
        switch(planType) {
            case 'basic': creditAmount = 50; break;
            default: creditAmount = 50; break;
        }
    } else {
        // This was the higher-priced payment link
        switch(planType) {
            case 'pro': creditAmount = 200; break;
            case 'unlimited': creditAmount = 999; break;
            default: creditAmount = 200; break;
        }
    }
    
    // Get current credits and add new ones
    const currentCredits = parseInt(localStorage.getItem('credits') || '0');
    const newCredits = currentCredits + creditAmount;
    
    // Update credits
    localStorage.setItem('credits', newCredits);
    document.getElementById('creditCount').textContent = `${newCredits} credits`;
    
    // Show success message
    alert('Payment successful! Credits added to your account.');
    
    // Clear the payment status from URL to prevent duplicate credits
    window.history.replaceState({}, document.title, window.location.pathname);
}

if (urlParams.get('payment_status') === 'failed') {
    alert('Payment failed. Please try again or contact support.');
    // Clear the payment status from URL
    window.history.replaceState({}, document.title, window.location.pathname);
}

// API Key Modal event listeners
const apiKeyModal = document.getElementById('apiKeyModal');
const closeModalBtn = document.getElementById('closeModal');

closeModalBtn.addEventListener('click', function() {
    apiKeyModal.style.display = 'none';
});

// Credits Modal event listeners
const buyCreditsBtn = document.getElementById('buyCreditsBtn');
const creditsModal = document.getElementById('creditsModal');
const closeCreditsModalBtn = document.getElementById('closeCreditsModal');
const cancelCreditsBtn = document.getElementById('cancelCredits');
const purchaseCreditsBtn = document.getElementById('purchaseCredits');
const paymentPlans = document.querySelectorAll('.payment-plan');

buyCreditsBtn.addEventListener('click', function() {
    creditsModal.style.display = 'flex';
});

closeCreditsModalBtn.addEventListener('click', function() {
    creditsModal.style.display = 'none';
});

cancelCreditsBtn.addEventListener('click', function() {
    creditsModal.style.display = 'none';
});

purchaseCreditsBtn.addEventListener('click', function() {
    const selectedPlan = document.querySelector('.payment-plan.selected');
    if (selectedPlan) {
        const planType = selectedPlan.getAttribute('data-plan');
        // Save selected plan to localStorage before redirect
        localStorage.setItem('selectedPlan', planType);
        
        // Choose payment link based on plan
        let paymentUrl;
        if (planType === 'basic') {
            // Lower-priced plan link
            paymentUrl = 'https://checkout.dodopayments.com/buy/pdt_pdX51NlsWQG0xc14FX9AM?quantity=1';
        } else {
            // Higher-priced plan link (pro and unlimited)
            paymentUrl = 'https://checkout.dodopayments.com/buy/pdt_QIW8J9Jozxx65k9awTQOe?quantity=1';
        }
        
        // Redirect to appropriate Dodo Payments checkout
        window.location.href = paymentUrl;
    } else {
        alert('Please select a plan');
    }
});

// Add event listeners to payment plans for selection
paymentPlans.forEach(plan => {
    plan.addEventListener('click', function() {
        paymentPlans.forEach(p => p.classList.remove('selected'));
        this.classList.add('selected');
    });
});