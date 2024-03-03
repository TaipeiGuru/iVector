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

        // Reference sizes for the circles
        var baseCircleRadius = scene.cameras.main.height * 0.015;
        var smallCircleRadius = scene.cameras.main.height * 0.009;

        // Store the initial zoom level
        var initialZoom = scene.cameras.main.zoom;

        var graphics = scene.add.graphics();
        updateGraphics(scene, graphics, centerX, centerY, baseCircleRadius, smallCircleRadius);

        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            if (deltaY > 0) {
                scene.cameras.main.zoom *= 0.9;
            } else {
                scene.cameras.main.zoom *= 1.1;
            }
            // Update graphics based on new zoom level
            updateGraphics(scene, graphics, centerX, centerY, baseCircleRadius, smallCircleRadius);
        });

        function updateGraphics(scene, graphics, centerX, centerY, baseRadius, smallRadius) {
            graphics.clear();
        
            // Calculate the adjustment factor for line thickness based on zoom level
            var zoomAdjustmentFactor = scene.cameras.main.zoom / initialZoom;
            var lineThickness = 1 / zoomAdjustmentFactor; // Adjusting line thickness inversely to zoom
        
            // Adjust circle sizes based on zoom level to maintain their screen size
            var adjustedBaseRadius = baseRadius / zoomAdjustmentFactor;
            var adjustedSmallRadius = smallRadius / zoomAdjustmentFactor;
        
            // Draw lines with adjusted thickness
            graphics.lineStyle(lineThickness, 0x924a49, 1);
            graphics.lineBetween(centerX, centerY, centerX + 300, centerY);
            graphics.lineBetween(centerX, centerY, centerX + 300, centerY + 15);
            graphics.lineBetween(centerX, centerY, centerX + 300, centerY - 15);
            graphics.lineBetween(centerX + 300, centerY - 15, centerX + 300, centerY + 15);
        
            // Draw circles with adjusted sizes
            graphics.fillStyle(0x2d86e2, 1);
            graphics.fillCircle(centerX, centerY, adjustedBaseRadius);
            graphics.fillStyle(0x94ee8d, 1);
            graphics.fillCircle(centerX, centerY, adjustedSmallRadius);
        }        


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