function toggleSpawn() {
    var button = document.getElementById('spawn');
    var dropdown = document.getElementById('approachSelect');
    button.classList.toggle('active');
    dropdown.style.display = button.classList.contains('active') ? 'inline-block' : 'none';
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
var mouseDown = false;
var planeCircle;
var mouseCircle;
var lineGraphics;
var assignedHeading = null;
var aircrafts = [];
var confirmMenu;
var altitudeMenu;
var generalMenu;
var contactMenu;
var speedMenu;
var approachSpeedMenu;
var maintainSpeedMenu;
var maintainSpeedActionMenu;
var runwayMenu;
var expectApproachMenu;
var suppressConfirmMenu = false;

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
        this.load.image('off_freq', 'assets/off_freq.png');
        this.load.image('in_sight', 'assets/in_sight.png');
        this.load.image('bust', 'assets/bust.png');
    }

    function create() {
        var scene = this;
        var centerX = scene.cameras.main.worldView.x + scene.cameras.main.width / 2;
        var centerY = scene.cameras.main.worldView.y + scene.cameras.main.height / 2;
        window.AIRPORT_X = centerX;
        window.AIRPORT_Y = centerY;
        var baseCircleRadius = scene.cameras.main.height * 0.015;
        var smallCircleRadius = scene.cameras.main.height * 0.009;
        var initialZoom = scene.cameras.main.zoom;
        var graphics = scene.add.graphics();
        planeCircle = scene.add.graphics();
        mouseCircle = scene.add.graphics();
        lineGraphics = scene.add.graphics();

        var headingText = scene.add.text(0, 0, '', {
            font: '16px Arial',
            fill: '#DD8AE6',
            backgroundColor: '#1b1b1b',
            padding: { x: 5, y: 2 }
        }).setDepth(1).setVisible(false);

        confirmMenu = scene.add.container(0, 0).setDepth(2).setVisible(false);

        var menuHeight = (4 * btnHeight) + 20; // 4 button heights (from -1.5 to 2.5) plus padding
        var menuBg = scene.add.rectangle(0, 0, 160, menuHeight, 0x222222, 0.95).setStrokeStyle(1, 0xDD8AE6).setOrigin(0.5);

        var btnWidth = 155;
        var btnHeight = 30;

        var sendBtnBg = scene.add.rectangle(0, -btnHeight * 1.5, btnWidth, btnHeight, 0x3A3A3A).setOrigin(0.5).setInteractive();
        var sendBtnText = scene.add.text(0, -btnHeight * 1.5, 'Send', {
            font: '14px Arial',
            fill: '#FFFFFF'
        }).setOrigin(0.5);
        var assignBtnBg = scene.add.rectangle(0, -btnHeight * 0.5, btnWidth, btnHeight, 0x3A3A3A).setOrigin(0.5).setInteractive();
        var assignBtnText = scene.add.text(0, -btnHeight * 0.5, 'Assign Altitude', {
            font: '14px Arial',
            fill: '#FFFFFF'
        }).setOrigin(0.5);
        var clearApproachBtnBg = scene.add.rectangle(0, btnHeight * 0.5, btnWidth, btnHeight, 0x3A3A3A).setOrigin(0.5).setInteractive();
        var clearApproachBtnText = scene.add.text(0, btnHeight * 0.5, 'Clear For Approach', {
            font: '14px Arial',
            fill: '#FFFFFF'
        }).setOrigin(0.5);
        var missedBtnBg = scene.add.rectangle(0, btnHeight * 1.5, btnWidth, btnHeight, 0x3A3A3A).setOrigin(0.5).setInteractive();
        var missedBtnText = scene.add.text(0, btnHeight * 1.5, 'Missed Approach', {
            font: '14px Arial',
            fill: '#FFFFFF'
        }).setOrigin(0.5);

        var otherBtnBg = scene.add.rectangle(0, btnHeight * 2.5, btnWidth, btnHeight, 0x3A3A3A).setOrigin(0.5).setInteractive();
        var otherBtnText = scene.add.text(0, btnHeight * 2.5, 'Other Message', {
            font: '14px Arial',
            fill: '#FFFFFF'
        }).setOrigin(0.5);

        confirmMenu.add([
            menuBg,
            sendBtnBg, sendBtnText,
            assignBtnBg, assignBtnText,
            clearApproachBtnBg, clearApproachBtnText,
            missedBtnBg, missedBtnText,
            otherBtnBg, otherBtnText
        ]);

        generalMenu = scene.add.container(0, 0).setDepth(2).setVisible(false);
        const generalMenuItems = ["Request Speed", "Expect Approach", "Contact Other Frequency", "Clear For Approach", "Report Airport In Sight"];
        const generalBtnHeight = 30;
        const generalBtnWidth = 200;

        generalMenuItems.forEach((label, index) => {
            let yOffset = index * (generalBtnHeight + 5);
            let bg = scene.add.rectangle(0, yOffset, generalBtnWidth, generalBtnHeight, 0x3A3A3A).setOrigin(0.5).setInteractive();
            let text = scene.add.text(0, yOffset, label, {
                font: '14px Arial',
                fill: '#FFFFFF'
            }).setOrigin(0.5);
        
            bg.on('pointerdown', (event) => {
                generalMenu.setVisible(false);
                suppressConfirmMenu = true;
                const cam = scene.cameras.main;
                const worldCenter = cam.getWorldPoint(cam.width / 2, cam.height / 2);
                if (label === "Contact Other Frequency") {
                    contactMenu.setPosition(worldCenter.x, worldCenter.y);
                    contactMenu.setVisible(true);
                    event.stopPropagation();
                } else if (label === "Report Airport In Sight") {
                    if (selectedAircraft && selectedAircraft.approach == "VIS") {
                        selectedAircraft.lookForAirport = true;
                        selectedAircraft = null;
                    }
                } else if (label === "Clear For Approach") {
                    selectedAircraft.isCleared = true;
                    selectedAircraft.lookForAirport = false;
                    selectedAircraft.setTexture('aircraft');
                    selectedAircraft = null;
                } else if (label === "Request Speed") {
                    speedMenu.setPosition(worldCenter.x, worldCenter.y);
                    speedMenu.setVisible(true);
                    event.stopPropagation();
                } else if (label === "Expect Approach") {
                    expectApproachMenu.setPosition(worldCenter.x, worldCenter.y);
                    expectApproachMenu.setVisible(true);
                    event.stopPropagation();
                }
            });
        
            generalMenu.add([bg, text]);
        });

        altitudeMenu = scene.add.container(0, 0).setDepth(2).setVisible(false);
        const altitudeBtnHeight = 25;
        const altitudeBtnWidth = 100;
        let altitudeButtons = [];

        for (let i = 0; i < 10; i++) {
            let bg = scene.add.rectangle(0, i * (altitudeBtnHeight + 4), altitudeBtnWidth, altitudeBtnHeight, 0x4A4A4A).setOrigin(0.5).setInteractive();
            let text = scene.add.text(0, i * (altitudeBtnHeight + 4), '', {
                font: '13px Arial',
                fill: '#FFFFFF'
            }).setOrigin(0.5);
            altitudeMenu.add([bg, text]);
            altitudeButtons.push({ bg, text });
        }

        contactMenu = scene.add.container(0, 0).setDepth(2).setVisible(false);

        let contactBtn = scene.add.rectangle(0, 0, 160, 30, 0x3A3A3A).setOrigin(0.5).setInteractive();
        contactBtn.on('pointerdown', () => {
            contactMenu.setVisible(false);
            if (selectedAircraft) {
                if (selectedAircraft.approach == "RV") { 
                    selectedAircraft.isCleared = true;
                }
                selectedAircraft.setTexture('off_freq');
                if (selectedAircraft.label) {
                    selectedAircraft.label.destroy();
                    selectedAircraft.label = null;
                }
                selectedAircraft.setInteractive(false);
                selectedAircraft = null;
            }
        });
        let contactText = scene.add.text(0, 0, "Tower", {
            font: '14px Arial',
            fill: '#FFFFFF'
        }).setOrigin(0.5);

        contactMenu.add([contactBtn, contactText]);

        speedMenu = scene.add.container(0, 0).setDepth(2).setVisible(false);
        const speedOptions = ["Maintain Speed", "Approach Speed"];
        const speedBtnHeight = 30;
        const speedBtnWidth = 160;

        speedOptions.forEach((label, index) => {
            let yOffset = index * (speedBtnHeight + 5);
            let bg = scene.add.rectangle(0, yOffset, speedBtnWidth, speedBtnHeight, 0x3A3A3A).setOrigin(0.5).setInteractive();
            let text = scene.add.text(0, yOffset, label, {
                font: '14px Arial',
                fill: '#FFFFFF'
            }).setOrigin(0.5);

            bg.on('pointerdown', () => {
                suppressConfirmMenu = true;
                speedMenu.setVisible(false);
                const cam = scene.cameras.main;
                const worldCenter = cam.getWorldPoint(cam.width / 2, cam.height / 2);
                if (selectedAircraft) {
                    if (label === "Maintain Speed") {
                        const pointer = scene.input.activePointer.positionToCamera(scene.cameras.main);
                        maintainSpeedMenu.setPosition(worldCenter.x, worldCenter.y);
                        maintainSpeedMenu.setVisible(true);
                        event.stopPropagation();
                    } else if (label === "Approach Speed") {
                        const pointer = scene.input.activePointer.positionToCamera(scene.cameras.main);
                        approachSpeedMenu.setPosition(worldCenter.x, worldCenter.y);
                        approachSpeedMenu.setVisible(true);
                        event.stopPropagation();
                    }
                }
            });

            speedMenu.add([bg, text]);
        });

        approachSpeedMenu = scene.add.container(0, 0).setDepth(3).setVisible(false);
        const approachOptions = [
            { label: "Maintain 160kts until 4 mile final", speed: 160 },
            { label: "Maintain 170kts until 5 mile final", speed: 170 },
            { label: "Maintain 180kts until 6 mile final", speed: 180 }
        ];
        const approachBtnHeight = 30;
        const approachBtnWidth = 260;

        approachOptions.forEach((option, index) => {
            let yOffset = index * (approachBtnHeight + 5);
            let bg = scene.add.rectangle(0, yOffset, approachBtnWidth, approachBtnHeight, 0x3A3A3A).setOrigin(0.5).setInteractive();
            let text = scene.add.text(0, yOffset, option.label, {
                font: '14px Arial',
                fill: '#FFFFFF'
            }).setOrigin(0.5);

            bg.on('pointerdown', () => {
                suppressConfirmMenu = true;
                approachSpeedMenu.setVisible(false);
                if (selectedAircraft) {
                    selectedAircraft.targetSpeed = option.speed;
                }
            });

            approachSpeedMenu.add([bg, text]);
        });

        maintainSpeedMenu = scene.add.container(0, 0).setDepth(3).setVisible(false);
        const maintainSpeeds = [160, 170, 180, 190, 200, 210, 220, 230, 240, 250];
        const maintainBtnHeight = 30;
        const maintainBtnWidth = 140;

        maintainSpeeds.forEach((speed, index) => {
            let yOffset = index * (maintainBtnHeight + 4);
            let bg = scene.add.rectangle(0, yOffset, maintainBtnWidth, maintainBtnHeight, 0x3A3A3A).setOrigin(0.5).setInteractive();
            let text = scene.add.text(0, yOffset, `${speed}kts`, {
                font: '14px Arial',
                fill: '#FFFFFF'
            }).setOrigin(0.5);
            const cam = scene.cameras.main;
            const worldCenter = cam.getWorldPoint(cam.width / 2, cam.height / 2);
            bg.on('pointerdown', (event) => {
                suppressConfirmMenu = true;
                maintainSpeedMenu.setVisible(false);
                pendingSpeed = speed;
                const pointer = scene.input.activePointer.positionToCamera(scene.cameras.main);
                maintainSpeedActionMenu.setPosition(worldCenter.x, worldCenter.y);
                maintainSpeedActionMenu.setVisible(true);
                event.stopPropagation();
            });

            maintainSpeedMenu.add([bg, text]);
        });

        maintainSpeedActionMenu = scene.add.container(0, 0).setDepth(4).setVisible(false);
        const actionOptions = ["Or Below", "Send", "Or Greater"];
        const actionBtnHeight = 30;
        const actionBtnWidth = 140;

        let pendingSpeed = null; // store the selected speed

        actionOptions.forEach((label, index) => {
            let yOffset = index * (actionBtnHeight + 5);
            let bg = scene.add.rectangle(0, yOffset, actionBtnWidth, actionBtnHeight, 0x3A3A3A).setOrigin(0.5).setInteractive();
            let text = scene.add.text(0, yOffset, label, {
                font: '14px Arial',
                fill: '#FFFFFF'
            }).setOrigin(0.5);

            bg.on('pointerdown', () => {
                maintainSpeedActionMenu.setVisible(false);
                suppressConfirmMenu = true;

                if (!selectedAircraft || pendingSpeed === null) return;

                if (label === "Send") {
                    selectedAircraft.targetSpeed = pendingSpeed;
                } else if (label === "Or Below") {
                    if (selectedAircraft.airspeed > pendingSpeed) {
                        selectedAircraft.targetSpeed = pendingSpeed;
                    }
                } else if (label === "Or Greater") {
                    if (selectedAircraft.airspeed < pendingSpeed) {
                        selectedAircraft.targetSpeed = pendingSpeed;
                    }
                }

                pendingSpeed = null;
            });

            maintainSpeedActionMenu.add([bg, text]);
        });

        expectApproachMenu = scene.add.container(0, 0).setDepth(3).setVisible(false);
        const expectOptions = ["ILS", "VIS", "RV"];
        const expectBtnHeight = 30;
        const expectBtnWidth = 120;

        expectOptions.forEach((label, index) => {
            let yOffset = index * (expectBtnHeight + 5);
            let bg = scene.add.rectangle(0, yOffset, expectBtnWidth, expectBtnHeight, 0x3A3A3A).setOrigin(0.5).setInteractive();
            let text = scene.add.text(0, yOffset, label, {
                font: '14px Arial',
                fill: '#FFFFFF'
            }).setOrigin(0.5);
        
            bg.on('pointerdown', (event) => {
                expectApproachMenu.setVisible(false);
                suppressConfirmMenu = true;
                pendingApproachType = label;
                const cam = scene.cameras.main;
                const worldCenter = cam.getWorldPoint(cam.width / 2, cam.height / 2);
                runwayMenu.setPosition(worldCenter.x, worldCenter.y);
                runwayMenu.setVisible(true);
                event.stopPropagation();
            });
        
            expectApproachMenu.add([bg, text]);
        });

        let pendingApproachType = null;
        runwayMenu = scene.add.container(0, 0).setDepth(4).setVisible(false);
        let runwayBtn = scene.add.rectangle(0, 0, 80, 30, 0x3A3A3A).setOrigin(0.5).setInteractive();
        let runwayText = scene.add.text(0, 0, "27", {
            font: '14px Arial',
            fill: '#FFFFFF'
        }).setOrigin(0.5);

        runwayBtn.on('pointerdown', () => {
            runwayMenu.setVisible(false);
            suppressConfirmMenu = true;
            if (selectedAircraft && pendingApproachType) {
                selectedAircraft.approach = pendingApproachType;
                selectedAircraft.runway = 27;
                pendingApproachType = null;
            }
        });
        runwayMenu.add([runwayBtn, runwayText]);

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
            mouseDown = true;
            var camera = scene.cameras.main;
            var worldPoint = camera.getWorldPoint(pointer.x, pointer.y);
            let hitSprite = false;
            aircrafts.forEach(aircraft => {
                if(aircraft.getBounds().contains(worldPoint.x, worldPoint.y)) {
                    hitSprite = true;
                    selectedAircraft = aircraft;
                    return;
                }
            });
            if (!hitSprite && spawnButtonClicked) {
                var aircraft = scene.physics.add.sprite(worldPoint.x, worldPoint.y, 'aircraft');
                let currentZoom = scene.cameras.main.zoom;
                aircraft.setScale((scene.cameras.main.height * 0.0002) / currentZoom);
                aircraft.altitude = 100 * Math.floor(Math.random() * 80 + 40);
                aircraft.airspeed = Math.floor(Math.random() * 100 + 200)
                let selectedApproach = document.getElementById('approachSelect').value;
                aircraft.approach = selectedApproach || 'ILS'; // fallback to ILS
                aircraft.setInteractive();
                aircrafts.push(aircraft);
                aircraft.label = scene.add.text(aircraft.x, aircraft.y - 30, '', {
                    fontFamily: 'Arial',
                    fontSize: '14px',
                    fill: '#ffffff'
                }).setOrigin(0.5);
                if (aircraft.altitude < 10000 && aircraft.airspeed > 250) {
                    aircraft.airspeed = 250;
                }
                aircraft.isCleared = false;
                aircraft.lookForAirport = false;
                aircraft.isEstablished = false;
                aircraft.startedDescent = false;
                aircraft.runway = null;
                orientToField(aircraft, centerX, centerY);
                aircraft.currentHeading = aircraft.angle;
                aircraft.targetHeading = aircraft.angle;
                adjustMovement(aircraft);
            } else if (!spawnButtonClicked && !hitSprite) {
                scene.isDragging = true;
                let zoom = scene.cameras.main.zoom;
                scene.dragStart.x = (pointer.x / zoom) + scene.cameras.main.scrollX;
                scene.dragStart.y = (pointer.y / zoom) + scene.cameras.main.scrollY;
            }
        });

        this.input.on('pointermove', (pointer) => {
            if (mouseDown && selectedAircraft != null) {
                lineGraphics.clear();
                mouseCircle.clear();
        
                var worldPoint = scene.input.activePointer.positionToCamera(scene.cameras.main);
                var lineThickness = 3 / scene.cameras.main.zoom;
        
                lineGraphics.lineStyle(lineThickness, 0xDD8AE6, 1);
                lineGraphics.lineBetween(selectedAircraft.x, selectedAircraft.y, worldPoint.x, worldPoint.y);
        
                mouseCircle.lineStyle(lineThickness, 0xDD8AE6, 1);
                mouseCircle.strokeCircle(worldPoint.x, worldPoint.y, selectedAircraft.displayWidth / 4);
        
                var dx = worldPoint.x - selectedAircraft.x;
                var dy = selectedAircraft.y - worldPoint.y; 
                var angleRad = Math.atan2(dx, dy); 
                var angleDeg = Phaser.Math.RadToDeg(angleRad);
                if (angleDeg < 0) angleDeg += 360;
                var heading = Math.round(angleDeg / 10) * 10;
                assignedHeading = heading;

                const deltaX = worldPoint.x - selectedAircraft.x;
                const deltaY = worldPoint.y - selectedAircraft.y;
                const pixelDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                const nmDistance = (pixelDistance / 300) * 11; // 300px = 11nm (adjust if needed)

                headingText.setText(`${heading}°  ${Math.round(nmDistance)}nm`);
                headingText.setPosition(worldPoint.x + 10, worldPoint.y - 30);
                headingText.setVisible(true);
            } else if (this.isDragging) {
                let zoom = scene.cameras.main.zoom;
                this.cameras.main.scrollX = this.dragStart.x - (pointer.x / zoom);
                this.cameras.main.scrollY = this.dragStart.y - (pointer.y / zoom);
                headingText.setVisible(false);
            } else {
                headingText.setVisible(false);
            }
        });
    
        this.input.on('pointerup', () => {

            this.isDragging = false;
            mouseDown = false;
        
            if (selectedAircraft != null && !suppressConfirmMenu) {
                var worldPoint = scene.input.activePointer.positionToCamera(scene.cameras.main);
                confirmMenu.setPosition(worldPoint.x + 10, worldPoint.y + 10);
                confirmMenu.setVisible(true);
            }
        
            // selectedAircraft = null;
            planeCircle.clear();
            mouseCircle.clear();
            lineGraphics.clear();
            headingText.setVisible(false);
            suppressConfirmMenu = false;

        });        

        this.input.on('pointerdown', function (pointer) {
            const camera = scene.cameras.main;
            const worldX = camera.getWorldPoint(pointer.x, pointer.y).x;
            const worldY = camera.getWorldPoint(pointer.x, pointer.y).y;
            if (confirmMenu.visible) {
                let bounds = menuBg.getBounds();
                if (
                    worldX < bounds.x ||
                    worldX > bounds.x + bounds.width ||
                    worldY < bounds.y ||
                    worldY > bounds.y + bounds.height
                ) {
                    confirmMenu.setVisible(false);
                    selectedAircraft = null;
                }
            }
            if (altitudeMenu.visible) {
                let bounds = altitudeMenu.getBounds();
                if (
                    worldX < bounds.x ||
                    worldX > bounds.x + bounds.width ||
                    worldY < bounds.y ||
                    worldY > bounds.y + bounds.height
                ) {
                    altitudeMenu.setVisible(false);
                    selectedAircraft = null;
                }
            }
            if (generalMenu.visible) {
                let bounds = generalMenu.getBounds();
                if (
                    worldX < bounds.x ||
                    worldX > bounds.x + bounds.width ||
                    worldY < bounds.y ||
                    worldY > bounds.y + bounds.height
                ) {
                    generalMenu.setVisible(false);
                    selectedAircraft = null;
                }
            }
            if (contactMenu.visible) {
                let bounds = contactMenu.getBounds();
                if (
                    worldX < bounds.x ||
                    worldX > bounds.x + bounds.width ||
                    worldY < bounds.y ||
                    worldY > bounds.y + bounds.height
                ) {
                    contactMenu.setVisible(false);
                    selectedAircraft = null;
                }
            }
            if (speedMenu.visible) {
                let bounds = speedMenu.getBounds();
                if (
                    worldX < bounds.x ||
                    worldX > bounds.x + bounds.width ||
                    worldY < bounds.y ||
                    worldY > bounds.y + bounds.height
                ) {
                    speedMenu.setVisible(false);
                    selectedAircraft = null;
                }
            }  
            if (approachSpeedMenu.visible) {
                let bounds = approachSpeedMenu.getBounds();
                if (
                    worldX < bounds.x ||
                    worldX > bounds.x + bounds.width ||
                    worldY < bounds.y ||
                    worldY > bounds.y + bounds.height
                ) {
                    approachSpeedMenu.setVisible(false);
                    selectedAircraft = null;
                }
            }
            if (maintainSpeedMenu.visible) {
                let bounds = maintainSpeedMenu.getBounds();
                if (
                    worldX < bounds.x ||
                    worldX > bounds.x + bounds.width ||
                    worldY < bounds.y ||
                    worldY > bounds.y + bounds.height
                ) {
                    maintainSpeedMenu.setVisible(false);
                    selectedAircraft = null;
                }
            } 
            if (maintainSpeedActionMenu.visible) {
                let bounds = maintainSpeedActionMenu.getBounds();
                if (
                    worldX < bounds.x ||
                    worldX > bounds.x + bounds.width ||
                    worldY < bounds.y ||
                    worldY > bounds.y + bounds.height
                ) {
                    maintainSpeedActionMenu.setVisible(false);
                    selectedAircraft = null;
                    pendingSpeed = null;
                }
            }   
            if (runwayMenu.visible) {
                let bounds = runwayMenu.getBounds();
                if (
                    worldX < bounds.x ||
                    worldX > bounds.x + bounds.width ||
                    worldY < bounds.y ||
                    worldY > bounds.y + bounds.height
                ) {
                    runwayMenu.setVisible(false);
                    selectedAircraft = null;
                }
            }
            if (expectApproachMenu.visible) {
                let bounds = expectApproachMenu.getBounds();
                if (
                    worldX < bounds.x ||
                    worldX > bounds.x + bounds.width ||
                    worldY < bounds.y ||
                    worldY > bounds.y + bounds.height
                ) {
                    expectApproachMenu.setVisible(false);
                    selectedAircraft = null;
                }
            }
        });

        assignBtnBg.on('pointerdown', (event) => {
            confirmMenu.setVisible(false);
            suppressConfirmMenu = true; 
            if (!selectedAircraft || assignedHeading === null) return;
        
            // Calculate valid altitudes
            let current = Math.floor(selectedAircraft.altitude / 1000) * 1000;
            let options = [];
        
            // Higher altitudes (max 3, not above 18000)
            for (let a = current + 3000; a <= 18000 && options.length < 3 && a > current; a -= 1000) {
                options.push(a);
            }
        
            // Current level
            options.push(current);
        
            // Lower altitudes (fill up to 10 buttons)
            for (let a = current - 1000; a >= 1000 && options.length < 10; a -= 1000) {
                options.push(a);
            }
        
            // Fill buttons
            for (let i = 0; i < 10; i++) {
                const { bg, text } = altitudeButtons[i];
                const alt = options[i] ?? '';
                bg.setVisible(alt !== '');
                text.setVisible(alt !== '');
                if (alt !== '') {
                    text.setText(`${alt} ft`);
                    bg.removeAllListeners();  // Clear old listeners
                    bg.on('pointerdown', () => {
                        selectedAircraft.isCleared = false;
                        selectedAircraft.isEstablished = false;
                        selectedAircraft.targetAltitude = alt;
                        selectedAircraft.targetHeading = assignedHeading;
                        adjustMovement(selectedAircraft);
                        selectedAircraft = null;
                        altitudeMenu.setVisible(false);
                    });
                }
            }
            const cam = scene.cameras.main;
            const worldCenter = cam.getWorldPoint(cam.width / 2, cam.height / 2);
            altitudeMenu.setPosition(worldCenter.x, worldCenter.y);
            altitudeMenu.setVisible(true);
            event.stopPropagation();
        });        

        sendBtnBg.on('pointerdown', (event) => {
            selectedAircraft.isCleared = false;
            selectedAircraft.isEstablished = false;
            confirmMenu.setVisible(false);
            suppressConfirmMenu = true;
            if (!selectedAircraft || assignedHeading === null) return;
            
            selectedAircraft.targetHeading = assignedHeading;
            adjustMovement(selectedAircraft);
            selectedAircraft = null;
            event.stopPropagation();
        });
        
        clearApproachBtnBg.on('pointerdown', (event) => {
            confirmMenu.setVisible(false);
            suppressConfirmMenu = true; 
            if (!selectedAircraft || assignedHeading === null) return;
        
            let current = Math.floor(selectedAircraft.altitude / 1000) * 1000;
            let options = [];
        
            for (let a = current + 3000; a <= 18000 && options.length < 3 && a > current; a -= 1000) {
                options.push(a);
            }
        
            options.push(current);
        
            for (let a = current - 1000; a >= 1000 && options.length < 10; a -= 1000) {
                options.push(a);
            }
        
            for (let i = 0; i < 10; i++) {
                const { bg, text } = altitudeButtons[i];
                const alt = options[i] ?? '';
                bg.setVisible(alt !== '');
                text.setVisible(alt !== '');
                if (alt !== '') {
                    text.setText(`${alt} ft`);
                    bg.removeAllListeners();
                    bg.on('pointerdown', () => {
                        selectedAircraft.isCleared = true;
                        selectedAircraft.targetAltitude = alt;
                        selectedAircraft.targetHeading = assignedHeading;
                        adjustMovement(selectedAircraft);
                        selectedAircraft = null;
                        altitudeMenu.setVisible(false);
                    });
                }
            }
            const cam = scene.cameras.main;
            const worldCenter = cam.getWorldPoint(cam.width / 2, cam.height / 2);
            altitudeMenu.setPosition(worldCenter.x, worldCenter.y);
            altitudeMenu.setVisible(true);
            event.stopPropagation();
        });        
        
        missedBtnBg.on('pointerdown', (event) => {
            confirmMenu.setVisible(false);
            selectedAircraft.isCleared = false;
            selectedAircraft.isEstablished = false;
            suppressConfirmMenu = true; 
            if (!selectedAircraft || assignedHeading === null) return;
        
            // Calculate valid altitudes
            let current = Math.floor(selectedAircraft.altitude / 1000) * 1000;
            let options = [];
        
            // Higher altitudes (max 3, not above 18000)
            for (let a = current + 3000; a <= 18000 && options.length < 3 && a > current; a -= 1000) {
                options.push(a);
            }
        
            // Current level
            options.push(current);
        
            // Lower altitudes (fill up to 10 buttons)
            for (let a = current - 1000; a >= 1000 && options.length < 10; a -= 1000) {
                options.push(a);
            }
        
            // Fill buttons
            for (let i = 0; i < 10; i++) {
                const { bg, text } = altitudeButtons[i];
                const alt = options[i] ?? '';
                bg.setVisible(alt !== '');
                text.setVisible(alt !== '');
                if (alt !== '') {
                    text.setText(`${alt} ft`);
                    bg.removeAllListeners();  // Clear old listeners
                    bg.on('pointerdown', () => {
                        selectedAircraft.targetAltitude = alt;
                        selectedAircraft.targetHeading = assignedHeading;
                        adjustMovement(selectedAircraft);
                        selectedAircraft = null;
                        altitudeMenu.setVisible(false);
                    });
                }
            }
            const cam = scene.cameras.main;
            const worldCenter = cam.getWorldPoint(cam.width / 2, cam.height / 2);
            altitudeMenu.setPosition(worldCenter.x, worldCenter.y);
            altitudeMenu.setVisible(true);
            event.stopPropagation();
        });

        otherBtnBg.on('pointerdown', (event) => {
            confirmMenu.setVisible(false);
            suppressConfirmMenu = true;
            const cam = scene.cameras.main;
            const worldCenter = cam.getWorldPoint(cam.width / 2, cam.height / 2);
            generalMenu.setPosition(worldCenter.x, worldCenter.y);
            generalMenu.setVisible(true);
            event.stopPropagation();
        });
        
    }

    function update(time, delta) {
        let centerX = AIRPORT_X;
        let centerY = AIRPORT_Y;
        if (selectedAircraft != null && planeCircle != null && lineGraphics != null && mouseDown) {
            planeCircle.clear();
            planeCircle.lineStyle(3 / this.cameras.main.zoom, 0xDD8AE6, 1);
            planeCircle.strokeCircle(selectedAircraft.x, selectedAircraft.y, selectedAircraft.displayWidth / 4);
        }

        aircrafts.forEach(aircraft => {
            if (aircraft.label) {
                let altitudeShort = Math.round(aircraft.altitude / 100);
                let labelText = "";
                if (
                    typeof aircraft.targetAltitude !== "undefined" &&
                    Math.abs(aircraft.altitude - aircraft.targetAltitude) > 1
                ) {
                    let targetShort = Math.round(aircraft.targetAltitude / 100);
                    labelText = `${altitudeShort} > ${targetShort}`;
                } else {
                    labelText = `${altitudeShort}`;
                }

                labelText += ` ${Math.round(aircraft.airspeed)}KT`;
                if (aircraft.approach) {
                    labelText += ` ${aircraft.approach}`;
                }
                if (aircraft.runway != null) {
                    labelText += ` ${aircraft.runway}`;
                }
                aircraft.label.setText(labelText);
                aircraft.label.setPosition(aircraft.x, aircraft.y - aircraft.displayHeight / 1.2);
                
                // Scale label based on camera zoom
                let zoom = game.scene.keys.default.cameras.main.zoom;
                let baseZoom = 1.0;
                aircraft.label.setScale(1 / zoom);  // Inverse scaling keeps size consistent on screen
            }
            if (aircraft.targetAltitude !== undefined && aircraft.altitude !== aircraft.targetAltitude) {
                let rate = 25; // ft/sec descent
                let deltaFt = rate * (delta / 1000); // frame time based
                if (aircraft.altitude > aircraft.targetAltitude) {
                    aircraft.altitude -= deltaFt;
                    if (aircraft.altitude <= aircraft.targetAltitude) {
                        aircraft.altitude = aircraft.targetAltitude;
                        delete aircraft.targetAltitude;
                    }
                } else {
                    aircraft.altitude += deltaFt;
                    if (aircraft.altitude >= aircraft.targetAltitude) {
                        aircraft.altitude = aircraft.targetAltitude;
                        delete aircraft.targetAltitude;
                    }
                }
            }            
            if (aircraft.targetHeading !== undefined) {
                let current = Phaser.Math.Angle.WrapDegrees(aircraft.angle);
                let target = Phaser.Math.Angle.WrapDegrees(aircraft.targetHeading);
                let delta = Phaser.Math.Angle.ShortestBetween(current, target);
        
                // Turn rate (degrees per second)
                let turnRate = 3; // deg/sec
                let maxDelta = turnRate * (game.loop.delta / 1000); // based on frame time
        
                if (Math.abs(delta) < maxDelta) {
                    aircraft.angle = target;
                } else {
                    aircraft.angle += Math.sign(delta) * maxDelta;
                }
        
                adjustMovement(aircraft);
            }
            if (aircraft.approach == "ILS") {
                let headingRad = Phaser.Math.DegToRad(aircraft.angle - 90); // Adjust so 0° is up
                let dx = Math.cos(headingRad);
                let dy = Math.sin(headingRad);
                let interceptDistance = null;

                let interceptX = 0;
                let interceptY = centerY;
                if (Math.abs(dy) > 1e-6) {
                    let t = (centerY - aircraft.y) / dy;
                    interceptX = aircraft.x + t * dx;
                    if (t > 0 && interceptX >= centerX) {
                        let distPx = Math.sqrt((interceptX - centerX) ** 2 + (interceptY - centerY) ** 2);
                        interceptDistance = (distPx / 300) * 11;
                    }
                }
                if (interceptDistance) {
                    let distanceToInterceptPx = Math.sqrt((interceptX - aircraft.x) ** 2 + (interceptY - aircraft.y) ** 2);
                    let speedX = aircraft.body.velocity.x;
                    let speedY = aircraft.body.velocity.y;
                    let totalSpeedInPixelsPerSecond = Math.sqrt(speedX * speedX + speedY * speedY);
                    let timeToIntercept = distanceToInterceptPx / totalSpeedInPixelsPerSecond;
                    let projectedAltitude = aircraft.targetAltitude;
                    if (aircraft.targetAltitude < aircraft.altitude) {
                        projectedAltitude = Math.max(aircraft.altitude - (timeToIntercept * 25), aircraft.targetAltitude);
                    }
                    let maxInterceptAlt = Math.tan(Phaser.Math.DegToRad(3)) * interceptDistance * 6076;
                    let validIntercept = projectedAltitude <= maxInterceptAlt + 100; 
                    let isEastOfAirport = aircraft.x > centerX;
                    let isNorthOfLocalizer = aircraft.y < centerY;
                    let requiredInterceptHeading = isNorthOfLocalizer ? 240 : 300;
                    let isOnInterceptHeading = Math.abs(aircraft.angle + 360 - requiredInterceptHeading) <= 5;
                    if (validIntercept && aircraft.isCleared && isEastOfAirport && isOnInterceptHeading && Math.abs(aircraft.y - centerY) <= 6.5) {
                        aircraft.targetHeading = 270;
                        aircraft.isEstablished = true;
                        adjustMovement(aircraft);
                    }
                }
            } else if (aircraft.approach == "RV") {
                let isEastOfAirport = aircraft.x > centerX;
                if (aircraft.isCleared && isEastOfAirport && Math.abs(aircraft.y - centerY) <= 1.5) {
                    aircraft.angle = 270;
                    adjustMovement(aircraft);
                    aircraft.isEstablished = true;
                }
            } else if (aircraft.approach == "VIS") {
                let dx = AIRPORT_X - aircraft.x;
                let dy = AIRPORT_Y - aircraft.y;
                let angleToAirport = Phaser.Math.RadToDeg(Math.atan2(dx, -dy));
                if (angleToAirport < 0) angleToAirport += 360;
                let angleDiff = Phaser.Math.Angle.ShortestBetween((aircraft.angle + 360) % 360, angleToAirport);
                if (Math.abs(angleDiff) <= 85 && aircraft.lookForAirport) {
                    aircraft.setTexture('in_sight');
                    aircraft.lookForAirport = false; 
                } else if (Math.abs(angleDiff) > 85 && aircraft.texture.key == 'in_sight') {
                    aircraft.setTexture('aircraft');
                    aircraft.lookForAirport = true;
                }
                let isEastOfAirport = aircraft.x > centerX;
                if (aircraft.isCleared && isEastOfAirport && Math.abs(aircraft.y - centerY) <= 1.5) {
                    aircraft.angle = 270;
                    aircraft.isEstablished = true;
                    adjustMovement(aircraft);
                }
            }
            if (aircraft.isEstablished && aircraft.x <= centerX) {
                if (aircraft.label) {
                    aircraft.label.destroy();
                }
                aircraft.destroy();
                aircrafts = aircrafts.filter(a => a !== aircraft);

                let newAircraft = this.physics.add.sprite(centerX, centerY, 'aircraft');
                newAircraft.setScale((this.cameras.main.height * 0.0002) / this.cameras.main.zoom);
                newAircraft.angle = 270;
                newAircraft.altitude = 500;
                newAircraft.targetAltitude = 3000;
                newAircraft.airspeed = 200;
                newAircraft.setInteractive();
                newAircraft.approach = null; 
                newAircraft.isCleared = false;
                newAircraft.lookForAirport = false;
                newAircraft.isEstablished = false;
                newAircraft.startedDescent = false;
                newAircraft.runway = null;
                newAircraft.currentHeading = newAircraft.angle;
                newAircraft.targetHeading = newAircraft.angle;
                newAircraft.label = this.add.text(newAircraft.x, newAircraft.y - 30, '', {
                    fontFamily: 'Arial',
                    fontSize: '14px',
                    fill: '#ffffff'
                }).setOrigin(0.5);
                aircrafts.push(newAircraft);
                adjustMovement(newAircraft);
                return;
            }
            if (aircraft.targetSpeed !== undefined && aircraft.airspeed !== aircraft.targetSpeed) {
                let deltaSpeed = 0.68 * (delta / 1000);
                if (aircraft.airspeed < aircraft.targetSpeed) {
                    aircraft.airspeed = Math.min(aircraft.airspeed + deltaSpeed, aircraft.targetSpeed);
                } else {
                    aircraft.airspeed = Math.max(aircraft.airspeed - deltaSpeed, aircraft.targetSpeed);
                }
            
                if (Math.abs(aircraft.airspeed - aircraft.targetSpeed) < 1) {
                    aircraft.airspeed = aircraft.targetSpeed;
                    delete aircraft.targetSpeed;
                }
            
                adjustMovement(aircraft); // Reapply movement when speed changes
            }
            if (aircraft.isEstablished) {
                let distanceToAirportPx = Math.sqrt((centerX - aircraft.x) ** 2 + (centerY - aircraft.y) ** 2);
                let speedX = aircraft.body.velocity.x;
                let speedY = aircraft.body.velocity.y;
                let totalSpeedInPixelsPerSecond = Math.sqrt(speedX * speedX + speedY * speedY);
                let timeToAirport = distanceToAirportPx / totalSpeedInPixelsPerSecond;            
                if (aircraft.altitude <= aircraft.maxInterceptAlt) {
                    // Hold altitude until intercept, then descend to 0 at airport
                    if (!aircraft.startedDescent) {
                        let distanceInterceptToAirportPx = Math.sqrt((centerX - interceptX) ** 2 + (centerY - interceptY) ** 2);
                        let timeInterceptToAirport = distanceInterceptToAirportPx / totalSpeedInPixelsPerSecond;
                        aircraft.descentRate = aircraft.altitude / timeInterceptToAirport; // ft/s
                        aircraft.holdUntil = performance.now() + (timeToIntercept * 1000);
                        aircraft.startedDescent = false;
                    }
                    if (performance.now() >= aircraft.holdUntil) {
                        aircraft.altitude -= aircraft.descentRate * (delta / 1000);
                        if (aircraft.altitude < 0) aircraft.altitude = 0;
                        aircraft.startedDescent = true;
                    }
                } else {
                    let descentRate = aircraft.altitude / timeToAirport; // ft/s
                    aircraft.altitude -= descentRate * (delta / 1000);
                    if (aircraft.altitude < 0) aircraft.altitude = 0;
                }
            }
            let bust = false;
            let texture = aircraft.texture.key;
            for (let j = 0; j < aircrafts.length; j++) {
                const a2 = aircrafts[j];
                if (a2 === aircraft) continue; 
                const dx = aircraft.x - a2.x;
                const dy = aircraft.y - a2.y;
                const pixelDistance = Math.sqrt(dx * dx + dy * dy);
                const nmDistance = (pixelDistance / 300) * 11;
                const verticalSep = Math.abs(aircraft.altitude - a2.altitude);
                if (nmDistance < 3 && verticalSep < 1000) {
                    // aircraft is not cleared
                    if (!aircraft.isCleared || (aircraft.approach == "ILS" && !aircraft.isEstablished)) {
                        bust = true;
                    } else {
                        // other aircraft is not cleared and other aircraft is ILS and not established
                        if (a2.approach == "ILS" && !a2.isEstablished) {
                            bust = true
                        }
                        // other aircraft is not cleared and is VIS and is not cleared
                        if (a2.approach == "VIS" && !a2.isCleared) {
                            bust = true
                        }
                        // other aircraft is RV and is not cleared
                        if (a2.approach == "RV" && !a2.isCleared) {
                            bust = true
                        }
                    }
                }
            }
            if (bust) {
                aircraft.setTexture('bust');
            } else {
                aircraft.setTexture(texture);
            }
        });
        let zoom = game.scene.keys.default.cameras.main.zoom;
        if (confirmMenu.visible) {
            confirmMenu.setScale(1 / zoom);
        }
        if (altitudeMenu.visible) {
            altitudeMenu.setScale(1 / zoom);
        }     
        if (generalMenu.visible) {
            generalMenu.setScale(1 / zoom);
        }   
        if (contactMenu.visible) {
            contactMenu.setScale(1 / zoom);
        }   
        if (speedMenu.visible) {
            speedMenu.setScale(1 / zoom);
        }   
        if (maintainSpeedMenu.visible) {
            maintainSpeedMenu.setScale(1 / zoom);
        }
        if (maintainSpeedActionMenu.visible) {
            maintainSpeedActionMenu.setScale(1 / zoom);
        }
        if (runwayMenu.visible) {
            runwayMenu.setScale(1 / zoom);
        }          
        if (expectApproachMenu.visible) {
            expectApproachMenu.setScale(1 / zoom);
        }
    }

    function adjustMovement(aircraft) {
        let groundspeed = 0.003373155 * aircraft.altitude + aircraft.airspeed;
        let spriteSpeed = (groundspeed / 3128) * 29.1;
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
    }

    function calculateGameHeight() {
        var navbarHeight = document.querySelector('.navbar').offsetHeight;
        var windowHeight = window.innerHeight;
        return windowHeight - navbarHeight;
    }
});