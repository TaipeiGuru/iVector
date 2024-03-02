function toggleSpawn() {
    var button = document.getElementById('spawn');
    button.classList.toggle('active');
}
function toggleShare() {
    var button = document.getElementById('share');
    button.classList.toggle('active');
}
function toggleStart() {
    var button = document.getElementById('start');
    button.classList.toggle('active');
}

var spawnButtonClicked = false;

document.addEventListener('DOMContentLoaded', (event) => {
    // game
    var config = {
        type: Phaser.AUTO,
        width: window.innerWidth,
        height: calculateGameHeight(),
        backgroundColor: '#1b1b1b',
        scene: {
            preload: preload,
            create: create,
            update: update
        }
    };

    var game = new Phaser.Game(config);

    function preload() {
        this.load.image('aircraft', 'assets/aircrafticon.png');
    }

    function create() {
        var scene = this;

        var centerX = scene.cameras.main.worldView.x + scene.cameras.main.width / 2;
        var centerY = scene.cameras.main.worldView.y + scene.cameras.main.height / 2;
        var graphics = scene.add.graphics();
        graphics.lineStyle(1, 0x924a49, 1); // 2 pixels thick, white, fully opaque
        graphics.lineBetween(centerX, centerY, centerX + 300, centerY);
        graphics.lineBetween(centerX, centerY, centerX + 300, centerY + 15);
        graphics.lineBetween(centerX, centerY, centerX + 300, centerY - 15);
        graphics.lineBetween(centerX + 300, centerY - 15, centerX + 300, centerY + 15);
        graphics.fillStyle(0x2d86e2, 1);
        graphics.fillCircle(centerX, centerY, 8);
        graphics.fillStyle(0x94ee8d, 1);
        graphics.fillCircle(centerX, centerY, 4.5);

        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            if (deltaY > 0) {
                this.cameras.main.zoom *= 0.9;
            } else {
                this.cameras.main.zoom *= 1.1;
            }
        });

        document.getElementById('spawn').addEventListener('click', function () {
            spawnButtonClicked = !spawnButtonClicked;
        });

        this.input.on('pointerdown', function (pointer) {
            if (spawnButtonClicked) {
                var aircraft = scene.add.sprite(pointer.x, pointer.y, 'aircraft');
                aircraft.setScale(0.02);
            }
        });
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

    window.addEventListener('resize', function () {
        // Update game dimensions on window resize
        game.resize(window.innerWidth, calculateGameHeight());
    });
});

/*
function create() {
    // Your existing create code...

    // Variables to keep track of the initial pinch distance and the current zoom factor
    let initialDistance = null;
    let initialZoom = 1;

    this.input.on('pointerdown', function (pointer) {
        if (this.input.pointer1.isDown && this.input.pointer2.isDown) {
            // Calculate the distance between the two pointers
            initialDistance = Phaser.Math.Distance.Between(
                this.input.pointer1.x, this.input.pointer1.y,
                this.input.pointer2.x, this.input.pointer2.y
            );
            initialZoom = this.cameras.main.zoom;
        }
    }, this);

    this.input.on('pointermove', function (pointer) {
        if (this.input.pointer1.isDown && this.input.pointer2.isDown) {
            // Calculate the new distance between the two pointers
            let currentDistance = Phaser.Math.Distance.Between(
                this.input.pointer1.x, this.input.pointer1.y,
                this.input.pointer2.x, this.input.pointer2.y
            );

            // Calculate the scale ratio
            let scale = currentDistance / initialDistance;

            // Apply the scale ratio to the camera's zoom
            this.cameras.main.zoom = initialZoom * scale;
        }
    }, this);
}
*/