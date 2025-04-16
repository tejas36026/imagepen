document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.querySelector('.search-input');
    const flashcard = document.querySelector('.flashcard');
    const flashcardFront = document.querySelector('.flashcard-front');
    const flashcardBack = document.querySelector('.flashcard-back');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');

    let flashcards = [];
    let currentIndex = 0;

    // Toggle flashcard flip
    flashcard.addEventListener('click', () => {
        flashcard.classList.toggle('flipped');
    });

    // Fetch data from MediaWiki API
    async function fetchWikiData(query) {
        try {
            const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`);
            if (!response.ok) throw new Error('Page not found');
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching data:', error);
            return null;
        }
    }

    // Fetch related articles (using recommendation endpoint as a proxy for related searches)
    async function fetchRelatedArticles(seed) {
        try {
            const response = await fetch(
                `https://en.wikipedia.org/api/rest_v1/data/recommendation/article/creation/morelike/${encodeURIComponent(seed)}`
            );
            if (!response.ok) return [];
            const data = await response.json();
            return data.articles || [];
        } catch (error) {
            console.error('Error fetching related articles:', error);
            return [];
        }
    }

    // Create a flashcard object
    function createFlashcard(mainData, relatedData) {
        return {
            front: {
                title: mainData.title || 'No Title',
                content: mainData.extract || 'No summary available.'
            },
            back: {
                title: 'Related Info',
                content: relatedData.length > 0
                    ? relatedData.map(item => item.title).join(', ')
                    : 'No related articles found.'
            }
        };
    }

    // Render flashcard
    function renderFlashcard(index) {
        if (index < 0 || index >= flashcards.length) return;
        const card = flashcards[index];
        flashcardFront.innerHTML = `
            <h3>${card.front.title}</h3>
            <p>${card.front.content}</p>
        `;
        flashcardBack.innerHTML = `
            <h3>${card.back.title}</h3>
            <p>${card.back.content}</p>
        `;
        flashcard.classList.remove('flipped');
        updateNavigation();
    }

    // Update navigation buttons
    function updateNavigation() {
        prevBtn.disabled = currentIndex === 0;
        nextBtn.disabled = currentIndex === flashcards.length - 1;
    }

    // Handle search
    searchInput.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter' && searchInput.value.trim()) {
            const query = searchInput.value.trim();
            flashcardFront.innerHTML = '<h3>Loading...</h3><p>Fetching data...</p>';
            flashcardBack.innerHTML = '<h3>Loading...</h3><p>Fetching related info...</p>';

            const mainData = await fetchWikiData(query);
            if (!mainData) {
                flashcardFront.innerHTML = '<h3>Error</h3><p>Could not fetch data.</p>';
                flashcardBack.innerHTML = '<h3>Error</h3><p>No related info available.</p>';
                return;
            }

            const relatedData = await fetchRelatedArticles(query);
            flashcards = [createFlashcard(mainData, relatedData)];
            currentIndex = 0;
            renderFlashcard(currentIndex);
        }
    });

    // Navigation
    prevBtn.addEventListener('click', () => {
        if (currentIndex > 0) {
            currentIndex--;
            renderFlashcard(currentIndex);
        }
    });

    nextBtn.addEventListener('click', () => {
        if (currentIndex < flashcards.length - 1) {
            currentIndex++;
            renderFlashcard(currentIndex);
        }
    });
});