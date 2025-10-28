const pickerBtn = document.querySelector('#picker-btn');
const clearBtn = document.querySelector('#clear-btn');
const colorList = document.querySelector('.all-colors');
const exportBtn = document.querySelector('#export-btn');

let quickPick = localStorage.getItem('quickPick') === 'true' || false;
document.querySelector('#quickpick-input').checked = quickPick;
// Event listener for quick pick toggle
document.querySelector('#quickpick-input').addEventListener('change', (e) => {
    quickPick = e.currentTarget.checked;
    localStorage.setItem('quickPick', quickPick);
});

// Retrieving picked colors from localstorage or initializing an empty array
let pickedColors = JSON.parse(localStorage.getItem('colors-list')) || [];

// Variable to keep track of the current color popup
let currentPopup = null;

// Function to copy text to the clipboard
const copyToClipboard = async (text, element) => {
    try{
        await navigator.clipboard.writeText(text);
        element.innerText = 'Copied!';
        // Resetting element text after 1 second
        setTimeout(() => {
            element.innerText = text;
        }, 1000);
    }catch (error){
        alert('Failed to copy text');
    }
};

// Function to export colors as a text file
const exportColors = () => {
    const colorText = 'My Colors: \n\n' + pickedColors.join('\n');
    const blob = new Blob([colorText], { type: 'text/plain'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'MyColors.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

// Function to create the color popup
const createColorPopup = (color) => {
    const popup = document.createElement('div');
    popup.classList.add('color-popup');
    popup.style.backgroundImage = `linear-gradient(45deg, black, ${color})`;
    popup.innerHTML = `
        <div class="color-popup-content">
            <span class="close-popup">x</span>
            <div class="color-info">
                <div class="color-preview" style="background: ${color};">
                    <input type="color" value="${color}"/>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
                        <path d="M341.6 29.2L240.1 130.8l-9.4-9.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-9.4-9.4L482.8 170.4c39-39 39-102.2 0-141.1s-102.2-39-141.1 0zM55.4 323.3c-15 15-23.4 35.4-23.4 56.6v42.4L5.4 462.2c-8.5 12.7-6.8 29.6 4 40.4s27.7 12.5 40.4 4L89.7 480h42.4c21.2 0 41.6-8.4 56.6-23.4L309.4 335.9l-45.3-45.3L143.4 411.3c-3 3-7.1 4.7-11.3 4.7H96V379.9c0-4.2 1.7-8.3 4.7-11.3L221.4 247.9l-45.3-45.3L55.4 323.3z"/>
                    </svg>
                </div>
                <div class="color-details">
                    <div class="color-value">
                        <span class="label">Hex:</span>
                        <span class="value hex" data-color="${color}">${color}</span>
                    </div>
                    <div class="color-value">
                        <span class="label">RGB:</span>
                        <span class="value rgb" data-color="${color}">${hexToRgb(color)}</span>
                    </div>
                </div>
            </div>
            <span class="topText"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 16V4C3 2.89543 3.89543 2 5 2H15M9 22H18C19.1046 22 20 21.1046 20 20V8C20 6.89543 19.1046 6 18 6H9C7.89543 6 7 6.89543 7 8V20C7 21.1046 7.89543 22 9 22Z" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>Click the values to copy them</span>
        </div>
    `;

    // Event listener za color input - ažurira sve vrednosti u popup-u
    const colorInput = popup.querySelector('input[type="color"]');
    colorInput.addEventListener('input', (e) => {
        const newColor = e.target.value;
        
        // Ažuriraj background popup-a
        popup.style.backgroundImage = `linear-gradient(45deg, black, ${newColor})`;
        
        // Ažuriraj color-preview background
        const colorPreview = popup.querySelector('.color-preview');
        colorPreview.style.background = newColor;
        
        // Ažuriraj HEX vrednost
        const hexValue = popup.querySelector('.value.hex');
        hexValue.innerText = newColor;
        hexValue.dataset.color = newColor;
        
        // Ažuriraj RGB vrednost
        const rgbValue = popup.querySelector('.value.rgb');
        rgbValue.innerText = hexToRgb(newColor);
        rgbValue.dataset.color = newColor;
    });

    // Close button inside the popup
    const closePopup = popup.querySelector('.close-popup');
    closePopup.addEventListener('click', () => {
        document.body.removeChild(popup);
        currentPopup = null;
    });

    // Event listeners to copy color values to clipboard
    const colorValues = popup.querySelectorAll('.value');
    colorValues.forEach((value) => {
        value.addEventListener('click', (e) => {
            const text = e.currentTarget.innerText;
            copyToClipboard(text, e.currentTarget);
        });
    });

    return popup;
};

// Function to display the picked colors
const showColors = () => {
    colorList.innerHTML = pickedColors.map((color) => 
        `
            <li class="color">
                <span class="rect" style="background: ${color}; border: 1px solid ${color === '#ffffff' ? '#ccc' : color}"></span>
                <span class="value hex" data-color="${color}">${color}</span>
            </li>
        
        `
    ).join('');

    const colorElements = document.querySelectorAll('.color');
    colorElements.forEach((li) => {
        li.addEventListener('click', (e) => {
            const color = e.currentTarget.querySelector(".value.hex").dataset.color;
            if(currentPopup){
                document.body.removeChild(currentPopup);
            }
            const popup = createColorPopup(color);
            document.body.appendChild(popup);
            currentPopup = popup;
        });
    });

    const pickedColorsContainer = document.querySelector('.colors-list');
    pickedColorsContainer.classList.toggle('hide', pickedColors.length === 0);
};

// Function to convert a hex color code to rgb format
const hexToRgb = (hex) => {
    const bigint = parseInt(hex.slice(1), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgb(${r},${g},${b})`;
};

// Function to activate the eye dropper color picker
const activateEyeDropper = async () => {
    document.body.classList.add('picking');
    document.body.style.display = 'none';
    try {
        // Opening the eye dropper and retrieving the selected color
        const { sRGBHex } = await new EyeDropper().open();

        if(!pickedColors.includes(sRGBHex)){
            pickedColors.push(sRGBHex);
            localStorage.setItem('colors-list', JSON.stringify(pickedColors));
        }

        if(quickPick){
            try{
                await navigator.clipboard.writeText(sRGBHex);
            }catch{
                // Failed to copy color code
            }
        }

        showColors();
    } catch (error) {
        // Failed to copy color code
    } finally{
        document.body.classList.remove('picking');
        document.body.style.display = 'block';
    }
};

// Function to clear all picked colors
const clearAllColors = () => {
    pickedColors = [];
    localStorage.removeItem('colors-list');
    showColors();
};

// Event listeners for buttons
clearBtn.addEventListener('click', clearAllColors);
pickerBtn.addEventListener('click', activateEyeDropper);
exportBtn.addEventListener('click', exportColors);

// Display picked colors on document load
showColors();

document.querySelector('.toggle-settings').addEventListener('click', () => {
    document.querySelector('.picker').classList.toggle('hide');
    document.querySelector('.colors-list').classList.toggle('hide');
    document.querySelector('.settings-pane').classList.toggle('hide');
    document.querySelector('.toggle-settings').classList.toggle('active');
});