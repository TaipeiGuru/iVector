// utils.js
window.EventHandlers = {
    changeInput: function(selectedAircraft, altitudeButtons, dragged, altitudeMenu, cam, cleared) {
        confirmMenu.setVisible(false);
        suppressConfirmMenu = true; 
        if (!selectedAircraft) return;
        if (cleared && assignedHeading === null) return;
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
                bg.removeAllListeners();  // Clear old listeners
                bg.on('pointerdown', () => {
                    selectedAircraft.isCleared = cleared;
                    selectedAircraft.isEstablished = false;
                    selectedAircraft.targetAltitude = alt;
                    if (dragged) {
                        selectedAircraft.targetHeading = assignedHeading;
                    }
                    Utils.adjustMovement(selectedAircraft);
                    altitudeMenu.setVisible(false);
                    suppressConfirmMenu = true;
                });
            }
        }
        const worldCenter = cam.getWorldPoint(cam.width / 2, cam.height / 2);
        altitudeMenu.setPosition(worldCenter.x, worldCenter.y);
        altitudeMenu.setVisible(true);
    }
};
