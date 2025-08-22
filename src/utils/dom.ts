/**
 * DOM utility functions
 */

export const getDOMElement = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id) as T;
  if (!element) {
    throw new Error(`Element with id "${id}" not found`);
  }
  return element;
};

export const queryElement = <T extends HTMLElement>(selector: string): T => {
  const element = document.querySelector(selector) as T;
  if (!element) {
    throw new Error(`Element with selector "${selector}" not found`);
  }
  return element;
};

export const queryElements = <T extends HTMLElement>(selector: string): NodeListOf<T> => {
  return document.querySelectorAll(selector) as NodeListOf<T>;
};

export const createElement = <T extends keyof HTMLElementTagNameMap>(
  tagName: T,
  className?: string,
  textContent?: string
): HTMLElementTagNameMap[T] => {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  if (textContent) {
    element.textContent = textContent;
  }
  return element;
};

export const createElementWithHTML = <T extends keyof HTMLElementTagNameMap>(
  tagName: T,
  className: string,
  innerHTML: string
): HTMLElementTagNameMap[T] => {
  const element = document.createElement(tagName);
  element.className = className;
  element.innerHTML = innerHTML;
  return element;
};