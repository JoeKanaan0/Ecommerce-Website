// Allows the navigation bar to collapse on smaller screens.
var MenuItems = document.getElementById("MenuItems");

MenuItems.style.maxHeight = "0px";

function menutoggle() {
    if (MenuItems.style.maxHeight == "0px")
        {
            MenuItems.style.maxHeight = "200px";
        }
    else
        {
            MenuItems.style.maxHeight = "0px";
        }

}

// Doesn't allow the user to enter special characters into an input.
function alpha(e) {
    var k;
    document.all ? k = e.keyCode : k = e.which;
    return ((k > 64 && k < 91) || (k > 96 && k < 123) || k == 8 || k == 32 || (k >= 48 && k <= 57));
}

// This function changes the image when the user chooses a file.
function readURL(input) {
    if (input.files && input.files[0]) {
        var reader = new FileReader();

        reader.onload = function (e) {
            $('#blah')
                .attr('src', e.target.result)
                .width(120)
                .height(98);
        };

        reader.readAsDataURL(input.files[0]);
    }
}

// Same as the above function but displays a profile image instead.
function readProfileURL(input) {
    if (input.files && input.files[0]) {
        var reader = new FileReader();

        reader.onload = function (e) {
            $('#blah')
                .attr('src', e.target.result)
                .class("image")
        };

        reader.readAsDataURL(input.files[0]);
    }
}

function readSellURL(input) {
    if (input.files && input.files[0]) {
        var reader = new FileReader();

        reader.onload = function (e) {
            $('#blah')
                .attr('src', e.target.result)
                .class("image")
        };

        reader.readAsDataURL(input.files[0]);
    }
}

// Displays a popUp when the user clicks on a button
function popUp() {
    var popup = document.getElementById("myPopup");
    popup.classList.toggle("show");
}

function popUp2() {
    var popup = document.getElementById("myPopup2");
    popup.classList.toggle("show");
}