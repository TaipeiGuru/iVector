var host = false;
//  logic
window.socket = new WebSocket('ws://localhost:3000');

window.broadcastAircraftState = function() {
    if (!window.socket || window.socket.readyState !== WebSocket.OPEN) return;
    const state = aircrafts.map(a => ({
        id: a.id || (a.id = Math.random().toString(36).substr(2, 9)),
        x: a.x,
        y: a.y,
        angle: a.angle,
        altitude: a.altitude,
        airspeed: a.airspeed,
        targetAltitude: a.targetAltitude,
        targetHeading: a.targetHeading,
        targetSpeed: a.targetSpeed,
        isCleared: a.isCleared,
        isEstablished: a.isEstablished,
        handedOff: a.handedOff,
        approach: a.approach,
        runway: a.runway,
        startedDescent: a.startedDescent,
        lookForAirport: a.lookForAirport,
        hasInSight: a.hasInSight,
        texture: a.texture?.key || 'aircraft',
        labelVisible: a.labelVisible
    }));
    
    window.socket.send(JSON.stringify({ type: 'game_state', state }));
}

window.socket.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);

    if (msg.type === 'session_created') {
        Utils.displaySessionCode(msg.sessionCode);
    } else if (msg.type === 'session_joined') {
        Utils.displaySessionCode(msg.sessionCode);
    } else if (msg.type === 'game_state') {
        applyRemoteAircraftState?.(window.scene, msg.state); // Optional sync logic
    } else if (msg.type === 'error') {
        alert(msg.message);
    } else if (msg.type === 'peer_joined') {
        window.broadcastAircraftState(); // Send state to new client
    }
});
document.getElementById('share').addEventListener('click', () => {
    const shareBtn = document.getElementById('share');
    shareBtn.style.display = 'none';
    window.socket.send(JSON.stringify({ type: 'create_session' }));
});
const urlParams = new URLSearchParams(window.location.search);
const sessionCode = urlParams.get('session');

// Set host status: host if not joining someone else's session
if (!sessionCode) {
    host = true; // User is creating their own session (host)
}

if (sessionCode) {
    const shareBtn = document.getElementById('share');
    if (shareBtn) {
        shareBtn.disabled = true;
        shareBtn.classList.add('session-active'); 
    }
}
const waitForSocket = setInterval(() => {
    if (window.socket && window.socket.readyState === WebSocket.OPEN && sessionCode) {
        window.socket.send(JSON.stringify({ type: 'join_session', sessionCode: sessionCode.toUpperCase() }));
        clearInterval(waitForSocket);
    }
}, 200);

// button logic
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

var aircrafts = [];
var altitudeMenu;
var approachSpeedMenu;
var assignedHeading = null;
var confirmMenu;
var contactMenu;
var dragged = false;
var endSession = false;
var expectApproachMenu;
var expectVectorsMenu;
var generalMenu;
var lineGraphics;
var maintainSpeedMenu;
var maintainSpeedActionMenu;
var mouseCircle;
var mouseDown = false;
var pendingRunway = null;
var planeCircle;
var pointerDownX = 0;
var pointerDownY = 0;
var prevPointerCount = 0;
var runwayMap;
var runwayMenu;
var spawnButtonClicked = false;
var single;
var selectedAircraft = null;
var speedMenu;
var suppressConfirmMenu = false;
var timeSinceLastBroadcast = 0;
var velocityLines;
let isPinching = false;
let pinchFocal = { x: null, y: null };
let targetZoom = 1; // or whatever your initial zoom is

// Add this constant at the top with other constants
const AIRCRAFT_BASE_SCALE = 0.00015; // Standard scale factor for aircraft

document.addEventListener('DOMContentLoaded', (event) => {
    let gameHeight;
    try {
        gameHeight = Utils.calculateGameHeight();
    } catch (error) {
        // Fallback if navbar is not found
        gameHeight = window.innerHeight - 60; // assuming 60px navbar height
    }
    
    // game
    var config = {
        type: Phaser.AUTO,
        width: window.innerWidth,
        height: gameHeight,
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
        this.load.scenePlugin('rexgesturesplugin', 'https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rexgesturesplugin.min.js', 'rexGestures', 'rexGestures');
    }

    function create() {
        single = window.location.href.includes('single');
        var scene = this;
        window.scene = scene;
        var centerX = scene.cameras.main.worldView.x + scene.cameras.main.width / 2;
        var centerY = scene.cameras.main.worldView.y + scene.cameras.main.height / 2;
        runwayMap = {
            "27": centerY,
            "27L": centerY - 5,
            "27R": centerY + 5
        }
        window.AIRPORT_X = centerX;
        window.AIRPORT_Y = centerY;
        var baseCircleRadius = scene.cameras.main.height * 0.015;
        var smallCircleRadius = scene.cameras.main.height * 0.009;
        var initialZoom = scene.cameras.main.zoom;
        var graphics = scene.add.graphics();
        planeCircle = scene.add.graphics();
        mouseCircle = scene.add.graphics();
        lineGraphics = scene.add.graphics();
        velocityLines = scene.add.graphics();

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
            let bg = scene.add.rectangle(0, i * (altitudeBtnHeight + 1), altitudeBtnWidth, altitudeBtnHeight, 0x4A4A4A).setOrigin(0.5).setInteractive();
            let text = scene.add.text(0, i * (altitudeBtnHeight + 1), '', {
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
                selectedAircraft.handedOff = true;
                if (selectedAircraft.approach == "RV") { 
                    selectedAircraft.isCleared = true;
                }
                selectedAircraft.setTexture('off_freq');
                if (selectedAircraft.label) {
                    selectedAircraft.label.destroy();
                    selectedAircraft.label = null;
                    selectedAircraft.labelVisible = false;
                }
                selectedAircraft.disableInteractive();
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
                event.stopPropagation();
                selectedAircraft = null;
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
                selectedAircraft = null;
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

        expectVectorsMenu = scene.add.container(0, 0).setDepth(5).setVisible(false);

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
        
                runwayMenu.removeAll(true); // clear previous buttons
                let runways = single ? ["27"] : ["27L", "27R"];
                runways.forEach((r, i) => {
                    let rb = scene.add.rectangle(0, i * 35, 80, 30, 0x3A3A3A).setOrigin(0.5).setInteractive();
                    let rt = scene.add.text(0, i * 35, r, {
                        font: '14px Arial',
                        fill: '#FFFFFF'
                    }).setOrigin(0.5);
                    rb.on('pointerdown', (event) => {
                        suppressConfirmMenu = true;
                        runwayMenu.setVisible(false);
                        pendingRunway = r;
        
                        expectVectorsMenu.removeAll(true);
                        let evBtn = scene.add.rectangle(0, 0, 160, 30, 0x3A3A3A).setOrigin(0.5).setInteractive();
                        let evText = scene.add.text(0, 0, "Expect Vectors", {
                            font: '14px Arial',
                            fill: '#FFFFFF'
                        }).setOrigin(0.5);
                        evBtn.on('pointerdown', (event) => {
                            suppressConfirmMenu = true;
                            expectVectorsMenu.setVisible(false);
                            if (selectedAircraft) {
                                selectedAircraft.approach = pendingApproachType;
                                selectedAircraft.runway = pendingRunway;
                                pendingApproachType = null;
                                pendingRunway = null;
                            }
                            event.stopPropagation();
                        });
                        expectVectorsMenu.add([evBtn, evText]);
                        expectVectorsMenu.setPosition(worldCenter.x, worldCenter.y + 60);
                        expectVectorsMenu.setVisible(true);
                        event.stopPropagation();
                    });
                    runwayMenu.add([rb, rt]);
                });
        
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
        runwayMenu.add([runwayBtn, runwayText]);

        scene.physics.world.setBounds(0, 0, window.innerWidth, Utils.calculateGameHeight());
        Utils.updateGraphics(scene, graphics, centerX, centerY, baseCircleRadius, smallCircleRadius, initialZoom, single);

        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            let oldZoom = scene.cameras.main.zoom;
            if (deltaY > 0) {
                scene.cameras.main.zoom *= 0.9;
            } else {
                scene.cameras.main.zoom *= 1.1;
            }            
            Utils.updateGraphics(scene, graphics, centerX, centerY, baseCircleRadius, smallCircleRadius, initialZoom, single);
        });  

        document.getElementById('spawn').addEventListener('click', function () {
            spawnButtonClicked = !spawnButtonClicked;
            let btn = document.getElementById('spawn');
            if (spawnButtonClicked) {
                btn.style.backgroundColor = 'white';
                btn.style.color = 'black';
            } else {
                btn.style.backgroundColor = '#090808';
                btn.style.color = '#6CB472';    
            }
        });
        document.getElementById('endSession').addEventListener('click', function () {
            endSession = !endSession;
            var button = document.getElementById('endSession');
            if (!endSession) {
                button.style.backgroundColor = '#090808';
                button.style.color = '#6CB472';
            } else {
                button.style.backgroundColor = 'white';
                button.style.color = 'black';
            }
        });

        scene.isDragging = false;
        scene.dragStart = { x: 0, y: 0 };

        this.input.on('pointerdown', function (pointer) {
            dragged = false;
            mouseDown = true;
            pointerDownX = pointer.x;
            pointerDownY = pointer.y;
            var camera = scene.cameras.main;
            var worldPoint = camera.getWorldPoint(pointer.x, pointer.y);
            let hitSprite = false;
            aircrafts.forEach(aircraft => {
                if(aircraft.input && aircraft.input.enabled && aircraft.getBounds().contains(worldPoint.x, worldPoint.y)) {
                    hitSprite = true;
                    selectedAircraft = aircraft;
                    return;
                }
            });
            if (!hitSprite && spawnButtonClicked) {
                var aircraft = scene.physics.add.sprite(worldPoint.x, worldPoint.y, 'aircraft');
                let scale = scene.cameras.main.height * AIRCRAFT_BASE_SCALE / scene.cameras.main.zoom;
                Utils.createNewAircraft(scene, aircraft, scale, centerX, centerY, true, host);
                aircrafts.push(aircraft);
                broadcastAircraftState();
            } else if (!spawnButtonClicked && !hitSprite) {
                scene.isDragging = true;
                let zoom = scene.cameras.main.zoom;
                scene.dragStart.x = (pointer.x / zoom) + scene.cameras.main.scrollX;
                scene.dragStart.y = (pointer.y / zoom) + scene.cameras.main.scrollY;
            }
        });

        this.input.on('pointermove', (pointer) => {
            if (mouseDown && selectedAircraft != null) {
                if (!dragged) {
                    dragged = true;
                }
                result = Utils.redraw(dragged, scene, selectedAircraft, lineGraphics, mouseCircle, headingText);
                if (result.success && result.heading) {
                    assignedHeading = result.heading;
                }
            } else if (this.isDragging) {
                let zoom = scene.cameras.main.zoom;
                this.cameras.main.scrollX = this.dragStart.x - (pointer.x / zoom);
                this.cameras.main.scrollY = this.dragStart.y - (pointer.y / zoom);
                headingText.setVisible(false);
            } else {
                headingText.setVisible(false);
            }
        });
    
        this.input.on('pointerup', (pointer) => {
            let dx = pointer.x - pointerDownX;
            let dy = pointer.y - pointerDownY;
            distance = Math.sqrt(dx * dx + dy * dy);
            
            this.isDragging = false;
            mouseDown = false;

            let anyMenuVisible = 
            altitudeMenu.visible || 
            generalMenu.visible || 
            contactMenu.visible || 
            speedMenu.visible || 
            approachSpeedMenu.visible || 
            maintainSpeedMenu.visible || 
            maintainSpeedActionMenu.visible || 
            runwayMenu.visible || 
            expectApproachMenu.visible;
        
            if (selectedAircraft != null && !suppressConfirmMenu && !anyMenuVisible) {
                var worldPoint = scene.input.activePointer.positionToCamera(scene.cameras.main);
                confirmMenu.setPosition(worldPoint.x + 10, worldPoint.y + 10);
                confirmMenu.setVisible(true);
            }
        
            suppressConfirmMenu = false;
            planeCircle.clear();
            mouseCircle.clear();
            lineGraphics.clear();
            headingText.setVisible(false);
        });        

        this.input.on('pointerdown', function (pointer) {
            if (confirmMenu.visible) {
                let pointer = scene.input.activePointer;
                if (!menuBg.getBounds().contains(pointer.worldX, pointer.worldY)) {
                    confirmMenu.setVisible(false);
                    selectedAircraft = null;
                    suppressConfirmMenu = true;
                }
            }
            suppressConfirmMenu = Utils.menuVisible(pointer, scene, altitudeMenu, generalMenu, contactMenu, speedMenu, approachSpeedMenu, maintainSpeedMenu, maintainSpeedActionMenu, runwayMenu, expectApproachMenu);
            if (suppressConfirmMenu) pendingSpeed = null;
        });

        assignBtnBg.on('pointerdown', (event) => {
            const cam = scene.cameras.main;
            EventHandlers.changeInput(selectedAircraft, altitudeButtons, dragged, altitudeMenu, cam, false);
            selectedAircraft = null;
            event.stopPropagation();
        });        

        sendBtnBg.on('pointerdown', (event) => {
            selectedAircraft.isCleared = false;
            selectedAircraft.isEstablished = false;
            confirmMenu.setVisible(false);
            suppressConfirmMenu = true;
            if (!selectedAircraft || assignedHeading === null) return;
            
            selectedAircraft.targetHeading = assignedHeading;
            Utils.adjustMovement(selectedAircraft);
            selectedAircraft = null;
            event.stopPropagation();
        });
        
        clearApproachBtnBg.on('pointerdown', (event) => {
            const cam = scene.cameras.main;
            EventHandlers.changeInput(selectedAircraft, altitudeButtons, dragged, altitudeMenu, cam, true);
            selectedAircraft = null;
            event.stopPropagation();
        });        
        
        missedBtnBg.on('pointerdown', (event) => {
            const cam = scene.cameras.main;
            EventHandlers.changeInput(selectedAircraft, altitudeButtons, dragged, altitudeMenu, cam, false);
            selectedAircraft = null;
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
        
        // Set up zoom in/out buttons
        const ZOOM_STEP = 0.3;
        const MIN_ZOOM = 0.3;
        const MAX_ZOOM = 3;

        document.getElementById('zoomInBtn').addEventListener('click', function () {
            targetZoom = Math.min(scene.cameras.main.zoom + ZOOM_STEP, MAX_ZOOM);
        });

        document.getElementById('zoomOutBtn').addEventListener('click', function () {
            targetZoom = Math.max(scene.cameras.main.zoom - ZOOM_STEP, MIN_ZOOM);
        });
    }

    function update(time, delta) {
        velocityLines.clear();
        if (host) {
            timeSinceLastBroadcast += delta;
            if (timeSinceLastBroadcast > 1000) {
                broadcastAircraftState();
                timeSinceLastBroadcast = 0;
            }
        }
        let centerX = AIRPORT_X;
        let centerY = AIRPORT_Y;
        if (selectedAircraft != null && planeCircle != null && lineGraphics != null && mouseDown) {
            planeCircle.clear();
            planeCircle.lineStyle(3 / this.cameras.main.zoom, 0xDD8AE6, 1);
            planeCircle.strokeCircle(selectedAircraft.x, selectedAircraft.y, selectedAircraft.displayWidth / 4);
        }
        aircrafts.forEach(aircraft => {
            let zoom = this.cameras.main.zoom;
            aircraft.setScale(1 / (zoom * 7));  // Inverse scaling keeps size consistent on screen
            if (aircraft.body && aircraft.body.velocity) {
                const velocityX = aircraft.body.velocity.x;
                const velocityY = aircraft.body.velocity.y;
                const futureX = aircraft.x + (velocityX * 30);
                const futureY = aircraft.y + (velocityY * 30);
                velocityLines.lineStyle(2 / this.cameras.main.zoom, 0xFFFFFF, 0.8);
                velocityLines.beginPath();
                velocityLines.moveTo(aircraft.x, aircraft.y);
                velocityLines.lineTo(futureX, futureY);
                velocityLines.strokePath();
            }
            if (aircraft.altitude < 10500 && aircraft.airspeed > 250) {
                aircraft.targetSpeed = 250;
                Utils.adjustMovement(aircraft);
            }
            if (aircraft.label) {
                let altitudeShort = Math.round(aircraft.altitude / 100);
                let labelText = "";
                if (typeof aircraft.targetAltitude !== "undefined") {
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
                aircraft.labelVisible = true;
                
                // Scale label based on camera zoom
                aircraft.label.setScale(1 / zoom);  // Inverse scaling keeps size consistent on screen
            }
            if (aircraft.targetAltitude !== undefined && aircraft.altitude !== aircraft.targetAltitude) {
                let rate = 25; // ft/sec descent
                let deltaFt = rate * (delta / 1000); // frame time based
                if (aircraft.altitude > aircraft.targetAltitude) {
                    aircraft.altitude -= deltaFt;
                    if (aircraft.altitude <= aircraft.targetAltitude) {
                        aircraft.altitude = aircraft.targetAltitude;
                    }
                } else {
                    aircraft.altitude += deltaFt;
                    if (aircraft.altitude >= aircraft.targetAltitude) {
                        aircraft.altitude = aircraft.targetAltitude;
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
        
                Utils.adjustMovement(aircraft);
            }
            let runwayY = runwayMap[aircraft.runway];
            if (aircraft.approach == "ILS") {
                let headingRad = Phaser.Math.DegToRad(aircraft.angle - 90); // Adjust so 0° is up
                let dx = Math.cos(headingRad);
                let dy = Math.sin(headingRad);
                let interceptDistance = null;
                let interceptX = 0;
                let interceptY = runwayY;
                if (Math.abs(dy) > 1e-6) {
                    let t = (runwayY - aircraft.y) / dy;
                    interceptX = aircraft.x + t * dx;
                    if (t > 0 && interceptX >= centerX) {
                        let distPx = Math.sqrt((interceptX - centerX) ** 2 + (interceptY - runwayY) ** 2);
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
                    let isNorthOfLocalizer = aircraft.y < runwayY;
                    let requiredInterceptHeading = isNorthOfLocalizer ? 240 : 300;
                    let isOnInterceptHeading = Math.abs(aircraft.angle + 360 - requiredInterceptHeading) <= 5;
                    if (validIntercept && aircraft.isCleared && isEastOfAirport && isOnInterceptHeading && Math.abs(aircraft.y - runwayY) <= 6.5) {
                        aircraft.targetHeading = 270;
                        aircraft.isEstablished = true;
                        Utils.adjustMovement(aircraft);
                    }
                }
            } else if (aircraft.approach == "RV") {
                let isEastOfAirport = aircraft.x > centerX;
                if (aircraft.isCleared && isEastOfAirport && Math.abs(aircraft.y - runwayY) <= 1.5) {
                    aircraft.angle = 270;
                    Utils.adjustMovement(aircraft);
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
                    aircraft.hasInSight = true;
                } else if (Math.abs(angleDiff) > 85 && aircraft.texture.key == 'in_sight') {
                    aircraft.setTexture('aircraft');
                    aircraft.lookForAirport = true;
                    aircraft.hasInSight = false;
                }
                let isEastOfAirport = aircraft.x > centerX;
                if (aircraft.isCleared && isEastOfAirport && Math.abs(aircraft.y - runwayY) <= 1.5) {
                    aircraft.angle = 270;
                    aircraft.isEstablished = true;
                    Utils.adjustMovement(aircraft);
                }
            }
            if (aircraft.isEstablished && aircraft.x <= centerX) {
                let runway = aircraft.runway;
                if (aircraft.label) aircraft.label.destroy();
                aircraft.destroy();
                aircrafts = aircrafts.filter(a => a !== aircraft);
                console.log(endSession);
                if (!endSession) {
                    let newAircraft = this.physics.add.sprite(centerX, runwayMap[runway], 'aircraft');
                    let scale = this.cameras.main.height * AIRCRAFT_BASE_SCALE / this.cameras.main.zoom;
                    Utils.createNewAircraft(this, newAircraft, scale, centerX, centerY, false);
                    aircrafts.push(newAircraft);
                    broadcastAircraftState();
                }
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
            
                Utils.adjustMovement(aircraft); // Reapply movement when speed changes
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
                if (aircraft.handedOff) {
                    aircraft.setTexture('off_freq');
                } else if (aircraft.hasInSight) {
                    aircraft.setTexture('in_sight');
                } else {
                    aircraft.setTexture('aircraft');
                }
            }
        });
        let zoom = this.cameras.main.zoom;
        if (confirmMenu.visible) confirmMenu.setScale(1 / zoom);
        if (altitudeMenu.visible) altitudeMenu.setScale(1 / zoom);   
        if (generalMenu.visible) generalMenu.setScale(1 / zoom);
        if (contactMenu.visible) contactMenu.setScale(1 / zoom);
        if (speedMenu.visible) speedMenu.setScale(1 / zoom); 
        if (maintainSpeedMenu.visible) maintainSpeedMenu.setScale(1 / zoom);
        if (maintainSpeedActionMenu.visible) maintainSpeedActionMenu.setScale(1 / zoom);
        if (runwayMenu.visible) runwayMenu.setScale(1 / zoom);  
        if (expectApproachMenu.visible) expectApproachMenu.setScale(1 / zoom);

        // Smooth zoom transition
        const LERP_SPEED = 0.15; // 0.1-0.3 is a good range for smoothness
        if (Math.abs(zoom - targetZoom) > 0.01) {
            zoom += (targetZoom - zoom) * LERP_SPEED;
        } else {
            zoom = targetZoom; // Snap to target if very close
        }
        this.cameras.main.setZoom(zoom);
    }

    window.applyRemoteAircraftState = function applyRemoteAircraftState(scene, remoteState) {
        for (const s of remoteState) {
            let aircraft = aircrafts.find(a => a.id === s.id);
            if (!aircraft) {
                aircraft = scene.physics.add.sprite(s.x, s.y, 'aircraft');
                let scale = scene.cameras.main.height * AIRCRAFT_BASE_SCALE / scene.cameras.main.zoom;
                aircraft.setScale(scale);
                aircraft.id = s.id;
                aircraft.label = scene.add.text(s.x, s.y - 30, '', {
                    fontFamily: 'Arial',
                    fontSize: '14px',
                    fill: '#ffffff'
                }).setOrigin(0.5);
                aircrafts.push(aircraft);
            } else {
                if (s.texture && aircraft.texture?.key !== s.texture) {
                    aircraft.setTexture(s.texture);
                }
            }
            aircraft.x = s.x;
            aircraft.y = s.y;
            aircraft.angle = s.angle;
            aircraft.altitude = s.altitude;
            aircraft.airspeed = s.airspeed;
            aircraft.approach = s.approach;
            aircraft.targetAltitude = s.targetAltitude;
            aircraft.handedOff = s.handedOff;
            if (s.labelVisible) {
                if (!aircraft.label) {
                    aircraft.label = scene.add.text(aircraft.x, aircraft.y - 30, s.labelText, {
                        fontFamily: 'Arial',
                        fontSize: '14px',
                        fill: '#ffffff'
                    }).setOrigin(0.5);
                } else {
                    aircraft.label.setText(s.labelText);
                }
            } else {
                if (aircraft.label) {
                    aircraft.label.destroy();
                    aircraft.label = null;
                }
            }
            aircraft.targetHeading = s.targetHeading;
            aircraft.isCleared = s.isCleared;
            aircraft.isEstablished = s.isEstablished;
            aircraft.runway = s.runway;
            aircraft.startedDescent = s.startedDescent;
            aircraft.lookForAirport = s.lookForAirport;
            aircraft.hasInSight = s.hasInSight;
            if (host) aircraft.setInteractive();
        }
    }    
});