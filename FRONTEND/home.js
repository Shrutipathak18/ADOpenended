// (c) 2019-2020 EasyChair Ltd

'use strict';

function Slider(id, items, displayClass) {
  try {
    this.id = id;  
    // the element to hide when all items are displayed
    this.items = items; 
      // the base name used for all items
    this.current = 0;  
      // index of currently displayed item
    
    this.displayClass = displayClass; 
      // the class that will be assigned to the radio for displayed element
  }
  catch (err) {
    logError(err,'Slider.create');
  }
} // Slider

Slider.prototype.displayItem = function(index) {
  try {
    var items = this.items;
    if (index >= 0 && index < items.length && index != this.current) {
      $(this.items[this.current]).style.display = 'none';
      $(this.items[index]).style.display = 'block';

      var radioBlock = $(this.id);
      var displayClass = this.displayClass;
      removeClass(radioBlock.childNodes[this.current],displayClass) ;
      addClass(radioBlock.childNodes[index], displayClass);
      this.current = index;
    }
  }
  catch (err) {
    logError(err,'Slider.displayItem');
  }
}; // Slider.displayItem

function MenuHandler(burgerId, burgerClass, menuClass) {
  try {
    // the id of a main burger ul
    this.burgerId = burgerId;  
    // the class of burger submenu ul
    this.burgerClass = burgerClass; 
    // the class of submenu ul
    this.menuClass = menuClass; 
  }
  catch (err) {
    logError(err,'MenuHandler.create');
  }
} // MenuHandler

MenuHandler.prototype.touchBurger = function(event) {
  try {
    var elem = $(this.burgerId);
    toggleBurger(elem, elem.style.display !== 'block');
  }
  catch (err) {
    logError(err,'MenuHandler.touchBurger');
  }
} // touchBurger

MenuHandler.prototype.touchItem = function(event) {
  try {
    event.stopPropagation();
    var clicked = event.target;
    // when arrow is clicked
    if (clicked.nodeName === 'SPAN') clicked = clicked.parentNode;
    var elem = clicked.nextElementSibling;
    // burger menu
    if (elem.classList.contains(this.burgerClass)) {
      var items = document.getElementsByClassName(this.burgerClass);
      for (var i = 0; i < items.length; i++){
        var item = items[i];
        toggleBurger(item, elem === item && elem.style.display !== 'block');
      }
    } 
    else {
      var items = document.getElementsByClassName(this.menuClass);
      for (var i = 0; i < items.length; i++){
        var item = items[i];
        toggleMenu(item, elem === item && elem.style.visibility !== 'visible');
      }
    }
  }
  catch (err) {
    logError(err,'MenuHandler.touchItem');
  }
} // touchItem

function toggleBurger(elem, show) {
    elem.style.display = show ? 'block' : 'none';
    elem.style.opacity = show ? '1.0' : '0.0';
} // toggleBurger

function toggleMenu(elem, show) {
    elem.style.visibility = show ? 'visible' : 'hidden';
    elem.style.opacity = show ? '1.0' : '0.0';
} // toggleMenu
