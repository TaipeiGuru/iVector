// utils.js
window.Utils = {
    calculateGameHeight: function() { 
        var navbarHeight = document.querySelector('.navbar').offsetHeight;
        var windowHeight = window.innerHeight;
        return windowHeight - navbarHeight;
    },
    adjustMovement: function(aircraft) {
        let groundspeed = 0.003373155 * aircraft.altitude + aircraft.airspeed;
        let spriteSpeed = (groundspeed / 3128) * 29.1;
        let angleRadians = Phaser.Math.DegToRad(aircraft.angle);
        let velocityX = spriteSpeed * Math.sin(angleRadians);
        let velocityY = -spriteSpeed * Math.cos(angleRadians);
        aircraft.setVelocity(velocityX, velocityY);
    },
    orientToField: function(aircraft, centerX, centerY) {
        var angleToCenter = Math.atan2(centerY - aircraft.y, centerX - aircraft.x);
        var angleDegrees = Phaser.Math.RadToDeg(angleToCenter);
        aircraft.angle = angleDegrees + 90;
    },
    updateGraphics: function(scene, graphics, centerX, centerY, baseRadius, smallRadius, initialZoom, single) {
        graphics.clear();
        var zoomAdjustmentFactor = scene.cameras.main.zoom / initialZoom;
        var lineThickness = 1.5 / zoomAdjustmentFactor; // Adjusting line thickness inversely to zoom
        var adjustedBaseRadius = baseRadius / zoomAdjustmentFactor;
        var adjustedSmallRadius = smallRadius / zoomAdjustmentFactor;

        graphics.lineStyle(lineThickness, 0x924a49, 1);
        
        if (single) {
            graphics.lineBetween(centerX, centerY, centerX + 300, centerY);
            graphics.lineBetween(centerX, centerY, centerX + 300, centerY + 15);
            graphics.lineBetween(centerX, centerY, centerX + 300, centerY - 15);
            graphics.lineBetween(centerX + 300, centerY - 15, centerX + 300, centerY + 15);
        } else {
            var localizerOffset = 5; 
            var upperY = centerY - localizerOffset;
            graphics.lineBetween(centerX, upperY, centerX + 300, upperY);
            graphics.lineBetween(centerX, upperY, centerX + 300, upperY + 15);
            graphics.lineBetween(centerX, upperY, centerX + 300, upperY - 15);
            graphics.lineBetween(centerX + 300, upperY - 15, centerX + 300, upperY + 15);
            
            var lowerY = centerY + localizerOffset;
            graphics.lineBetween(centerX, lowerY, centerX + 300, lowerY);
            graphics.lineBetween(centerX, lowerY, centerX + 300, lowerY + 15);
            graphics.lineBetween(centerX, lowerY, centerX + 300, lowerY - 15);
            graphics.lineBetween(centerX + 300, lowerY - 15, centerX + 300, lowerY + 15);
        }
    
        graphics.fillStyle(0x2d86e2, 1);
        graphics.fillCircle(centerX, centerY, adjustedBaseRadius);
        graphics.fillStyle(0x94ee8d, 1);
        graphics.fillCircle(centerX, centerY, adjustedSmallRadius);
    },
    checkBounds: function(worldX, worldY, bounds) {
        return (
            worldX < bounds.x ||
            worldX > bounds.x + bounds.width ||
            worldY < bounds.y ||
            worldY > bounds.y + bounds.height
        );
    },
    createNewAircraft: function(scene, aircraft, scale, centerX, centerY, inbound, host) {
        aircraft.setScale(scale);
        if (inbound) { 
            aircraft.altitude = 100 * Math.floor(Math.random() * 80 + 40);
            aircraft.airspeed = Math.floor(Math.random() * 100 + 200);
            let selectedApproach = document.getElementById('approachSelect').value;
            aircraft.approach = selectedApproach || 'ILS'; // fallback to ILS
            if (aircraft.altitude < 10000 && aircraft.airspeed > 250) {
                aircraft.airspeed = 250;
            }
        } else {
            aircraft.angle = 270;
            aircraft.altitude = 500;
            aircraft.targetAltitude = 3000;
            aircraft.airspeed = 200;
        }
        if (host) aircraft.setInteractive();
        aircraft.label = scene.add.text(aircraft.x, aircraft.y - 30, '', {
            fontFamily: 'Arial',
            fontSize: '14px',
            fill: '#ffffff'
        }).setOrigin(0.5);
        aircraft.isCleared = false;
        aircraft.lookForAirport = false;
        aircraft.isEstablished = false;
        aircraft.startedDescent = false;
        aircraft.hasInSight = false;
        aircraft.handedOff = false;
        aircraft.runway = null;
        aircraft.labelVisible = true;
        if (inbound) this.orientToField(aircraft, centerX, centerY); 
        aircraft.currentHeading = aircraft.angle;
        aircraft.targetHeading = aircraft.angle;
        this.adjustMovement(aircraft);
    },
    menuVisible: function(pointer, scene, altitudeMenu, generalMenu, contactMenu, speedMenu, approachSpeedMenu, maintainSpeedMenu, maintainSpeedActionMenu, runwayMenu, expectApproachMenu) {
        const camera = scene.cameras.main;
        const worldX = camera.getWorldPoint(pointer.x, pointer.y).x;
        const worldY = camera.getWorldPoint(pointer.x, pointer.y).y;
        if (altitudeMenu.visible && this.checkBounds(worldX, worldY, altitudeMenu.getBounds())) {
            altitudeMenu.setVisible(false);
            return true;
        }
        if (generalMenu.visible && this.checkBounds(worldX, worldY, generalMenu.getBounds())) {
            generalMenu.setVisible(false);
            return true;
        }
        if (contactMenu.visible && this.checkBounds(worldX, worldY, contactMenu.getBounds())) {
            contactMenu.setVisible(false);
            return true;
        }
        if (speedMenu.visible && this.checkBounds(worldX, worldY, speedMenu.getBounds())) {
            speedMenu.setVisible(false);
            return true;
        }
        if (approachSpeedMenu.visible && this.checkBounds(worldX, worldY, approachSpeedMenu.getBounds())) {
            approachSpeedMenu.setVisible(false);
            return true;
        }
        if (maintainSpeedMenu.visible && this.checkBounds(worldX, worldY, maintainSpeedMenu.getBounds())) {
            maintainSpeedMenu.setVisible(false);
            return true;
        } 
        if (maintainSpeedActionMenu.visible && this.checkBounds(worldX, worldY, maintainSpeedActionMenu.getBounds())) {
            maintainSpeedActionMenu.setVisible(false);
            return true;
        }   
        if (runwayMenu.visible && this.checkBounds(worldX, worldY, runwayMenu.getBounds())) {
            runwayMenu.setVisible(false);
            return true;
        }
        if (expectApproachMenu.visible && this.checkBounds(worldX, worldY, expectApproachMenu.getBounds())) {
            expectApproachMenu.setVisible(false);
            return true;
        }
        return false;
    },
    redraw: function(dragged, scene, selectedAircraft, lineGraphics, mouseCircle, headingText) {
        if (!dragged) {
            return { success: false, heading: null };
        }
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

        const deltaX = worldPoint.x - selectedAircraft.x;
        const deltaY = worldPoint.y - selectedAircraft.y;
        const pixelDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const nmDistance = (pixelDistance / 300) * 11; // 300px = 11nm (adjust if needed)

        headingText.setText(`${heading}°  ${Math.round(nmDistance)}nm`);
        headingText.setPosition(worldPoint.x + 10, worldPoint.y - 30);
        headingText.setVisible(true);
        return { success: true, heading: heading };
    }
};
