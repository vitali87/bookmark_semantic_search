// Function to retrieve all bookmarks using Chrome API
function getBookmarks(callback) {
    chrome.bookmarks.getTree((bookmarkTreeNodes) => {
        const bookmarks = parseBookmarks(bookmarkTreeNodes);
        callback(bookmarks);
    });
}

// Parse the hierarchical bookmark structure into a flat array
function parseBookmarks(nodes) {
    let bookmarks = [];
    nodes.forEach((node) => {
        if (node.url) {
            bookmarks.push({
                title: node.title,
                url: node.url,
                folder: getFolderPath(node)
            });
        }
        if (node.children) {
            bookmarks = bookmarks.concat(parseBookmarks(node.children));
        }
    });
    return bookmarks;
}

// Retrieve folder path for each bookmark
function getFolderPath(node) {
    let path = [];
    let currentNode = node;
    while (currentNode.parentId) {
        currentNode = currentNode.parentNode || {}; // parentNode may not exist
        path.unshift(currentNode.title);
    }
    return path.join(' > ');
}

// Vectorize text using a simple Bag of Words method
function vectorizeText(text, vocabulary) {
    let vector = new Array(vocabulary.length).fill(0);
    const words = text.toLowerCase().split(/\W+/);
    words.forEach((word) => {
        const index = vocabulary.indexOf(word);
        if (index >= 0) {
            vector[index]++;
        }
    });
    return vector;
}

// Compute Cosine Similarity between two vectors
function cosineSimilarity(vec1, vec2) {
    const dotProduct = vec1.reduce((acc, value, index) => acc + value * vec2[index], 0);
    const magnitude1 = Math.sqrt(vec1.reduce((acc, value) => acc + value * value, 0));
    const magnitude2 = Math.sqrt(vec2.reduce((acc, value) => acc + value * value, 0));
    return dotProduct / (magnitude1 * magnitude2);
}

// Main Semantic Search function
function semanticSearch(query, bookmarks) {
    const vocabulary = createVocabulary(bookmarks);
    const queryVector = vectorizeText(query, vocabulary);

    const rankedBookmarks = bookmarks.map((bookmark) => {
        const bookmarkText = `${bookmark.title} ${bookmark.url} ${bookmark.folder}`;
        const bookmarkVector = vectorizeText(bookmarkText, vocabulary);
        const similarity = cosineSimilarity(queryVector, bookmarkVector);
        return { bookmark, similarity };
    });

    rankedBookmarks.sort((a, b) => b.similarity - a.similarity);
    return rankedBookmarks.map(item => item.bookmark);
}

// Create vocabulary from bookmark titles, URLs, and folder paths
function createVocabulary(bookmarks) {
    const allText = bookmarks
        .map(bookmark => `${bookmark.title} ${bookmark.url} ${bookmark.folder}`)
        .join(' ')
        .toLowerCase();
    return Array.from(new Set(allText.split(/\W+/)));
}

// Display search results in the popup
function displayResults(bookmarks) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '';
    bookmarks.forEach((bookmark) => {
        const link = document.createElement('a');
        link.href = bookmark.url;
        link.textContent = `${bookmark.title} (${bookmark.folder})`;
        link.target = '_blank';
        resultsDiv.appendChild(link);
        resultsDiv.appendChild(document.createElement('br'));
    });
}

// Add event listener for the search form
document.getElementById('searchForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const query = document.getElementById('searchQuery').value;

    getBookmarks((bookmarks) => {
        const results = semanticSearch(query, bookmarks);
        displayResults(results);
    });
});
