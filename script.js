document.addEventListener('DOMContentLoaded', (event) => {
    // game
    var config = {
        type: Phaser.AUTO,
        width: window.innerWidth,
        height: calculateGameHeight(),
        backgroundColor: '#3498db',
        scene: {
            preload: preload,
            create: create,
            update: update
        }
    };

    var game = new Phaser.Game(config);

    function preload() {
        // Preload assets if needed
    }

    function create() {
        // Create game entities
    }

    function update() {
        // Game logic
    }

    // Function to calculate game height based on window and navbar dimensions
    function calculateGameHeight() {
        var navbarHeight = document.querySelector('.navbar').offsetHeight;
        var windowHeight = window.innerHeight;
        return windowHeight - navbarHeight;
    }

    // Event listener for window resize
    window.addEventListener('resize', function () {
        // Update game dimensions on window resize
        game.resize(window.innerWidth, calculateGameHeight());
    });
});
