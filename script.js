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
var selectedAircraft = null;

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
        },
        physics: {
            default: 'arcade',
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
        var baseCircleRadius = scene.cameras.main.height * 0.015;
        var smallCircleRadius = scene.cameras.main.height * 0.009;
        var initialZoom = scene.cameras.main.zoom;
        var graphics = scene.add.graphics();
        var aircrafts = [];

        scene.physics.world.setBounds(0, 0, window.innerWidth, calculateGameHeight());

        function updateGraphics(scene, graphics, centerX, centerY, baseRadius, smallRadius) {
            graphics.clear();
            var zoomAdjustmentFactor = scene.cameras.main.zoom / initialZoom;
            var lineThickness = 1.5 / zoomAdjustmentFactor; // Adjusting line thickness inversely to zoom
            var adjustedBaseRadius = baseRadius / zoomAdjustmentFactor;
            var adjustedSmallRadius = smallRadius / zoomAdjustmentFactor;

            graphics.lineStyle(lineThickness, 0x924a49, 1);
            graphics.lineBetween(centerX, centerY, centerX + 300, centerY);
            graphics.lineBetween(centerX, centerY, centerX + 300, centerY + 15);
            graphics.lineBetween(centerX, centerY, centerX + 300, centerY - 15);
            graphics.lineBetween(centerX + 300, centerY - 15, centerX + 300, centerY + 15);
        
            graphics.fillStyle(0x2d86e2, 1);
            graphics.fillCircle(centerX, centerY, adjustedBaseRadius);
            graphics.fillStyle(0x94ee8d, 1);
            graphics.fillCircle(centerX, centerY, adjustedSmallRadius);
        }

        updateGraphics(scene, graphics, centerX, centerY, baseCircleRadius, smallCircleRadius);

        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            let oldZoom = scene.cameras.main.zoom;
            if (deltaY > 0) {
                scene.cameras.main.zoom *= 0.9;
            } else {
                scene.cameras.main.zoom *= 1.1;
            }
            let newZoom = scene.cameras.main.zoom;
            let scaleFactor = oldZoom / newZoom;
            scene.children.list.forEach(child => {
                if (child.type === 'Sprite') {
                    child.setScale(child.scaleX * scaleFactor);
                }
            });
        
            updateGraphics(scene, graphics, centerX, centerY, baseCircleRadius, smallCircleRadius);
        });        

        document.getElementById('spawn').addEventListener('click', function () {
            spawnButtonClicked = !spawnButtonClicked;
        });

        scene.isDragging = false;
        scene.dragStart = { x: 0, y: 0 };

        this.input.on('pointerdown', function (pointer) {
            var camera = scene.cameras.main;
            var worldPoint = camera.getWorldPoint(pointer.x, pointer.y);
            let hitSprite = false;
            aircrafts.forEach(aircraft => {
                if(aircraft.getBounds().contains(worldPoint.x, worldPoint.y)) {
                    hitSprite = true;
                    aircraft.destroy(); // Remove the clicked sprite
                    return;
                }
            });
            if (!hitSprite && spawnButtonClicked) {
                var aircraft = scene.physics.add.sprite(worldPoint.x, worldPoint.y, 'aircraft');
                let currentZoom = scene.cameras.main.zoom;
                aircraft.setScale((scene.cameras.main.height * 0.0002) / currentZoom);
                aircraft.altitude = 100 * Math.floor(Math.random() * 80 + 40);
                aircraft.airspeed = Math.floor(Math.random() * 100 + 200)
                aircraft.setInteractive();
                aircrafts.push(aircraft);
                if (aircraft.altitude < 10000 && aircraft.airspeed > 250) {
                    aircraft.airspeed = 250;
                }
                orientToField(aircraft, centerX, centerY);
                adjustMovement(aircraft);
            } else if (!spawnButtonClicked) {
                scene.isDragging = true;
                let zoom = scene.cameras.main.zoom;
                scene.dragStart.x = (pointer.x / zoom) + scene.cameras.main.scrollX;
                scene.dragStart.y = (pointer.y / zoom) + scene.cameras.main.scrollY;
            }
        });

        this.input.on('pointermove', (pointer) => {
            if (!this.isDragging) return;
            let zoom = scene.cameras.main.zoom;
            this.cameras.main.scrollX = this.dragStart.x - (pointer.x / zoom);
            this.cameras.main.scrollY = this.dragStart.y - (pointer.y / zoom);
        });

        this.input.on('pointerup', () => {
            this.isDragging = false;
        });
    }

    function adjustMovement(aircraft) {
        let groundspeed = 0.003373155 * aircraft.altitude + aircraft.airspeed;
        let spriteSpeed = (groundspeed / 3128) * 29.1;
        console.log(aircraft.altitude + " " + aircraft.airspeed + " " + groundspeed);
        let angleRadians = Phaser.Math.DegToRad(aircraft.angle);
        let velocityX = spriteSpeed * Math.sin(angleRadians);
        let velocityY = -spriteSpeed * Math.cos(angleRadians);
        aircraft.setVelocity(velocityX, velocityY);
    }

    function orientToField(aircraft, centerX, centerY) {
        var aircraftX = aircraft.x;
        var aircraftY = aircraft.y;
        var angleToCenter = Math.atan2(centerY - aircraftY, centerX - aircraftX);
        var angleDegrees = Phaser.Math.RadToDeg(angleToCenter);
        aircraft.angle = angleDegrees + 90;

        /*var offsetAngle = (180/Math.PI) * Math.asin((centerX-aircraftX) / Math.sqrt(Math.pow(centerX-aircraftX, 2) + Math.pow(centerY-aircraftY, 2)));
        if (aircraftX < centerX && aircraftY < centerY) {
            aircraft.angle += (180 - offsetAngle);
        } else if (aircraftX > centerX && aircraftY < centerY) {
            aircraft.angle -= (180 + offsetAngle);
        } else if (aircraftX < centerX && aircraftY > centerY) {
            aircraft.angle += offsetAngle;
        } else {
            aircraft.angle += offsetAngle;
        }*/
    }

    function update() {
        if (selectedAircraft != null && circleGraphics) {
            // Update the position of the circleGraphics to follow the selected aircraft
            circleGraphics.x = selectedAircraft.x;
            circleGraphics.y = selectedAircraft.y;
        }
    }

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