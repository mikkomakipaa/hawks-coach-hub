import { describe, it, expect, beforeEach } from 'vitest';
import { getDOMElement, createElement, createElementWithHTML } from './dom';

describe('DOM Utils', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  describe('getDOMElement', () => {
    it('should return element when it exists', () => {
      const div = document.createElement('div');
      div.id = 'test-element';
      document.body.appendChild(div);

      const result = getDOMElement('test-element');
      expect(result).toBe(div);
    });

    it('should throw error when element does not exist', () => {
      expect(() => getDOMElement('non-existent')).toThrow('Element with id "non-existent" not found');
    });
  });

  describe('createElement', () => {
    it('should create element with correct tag', () => {
      const element = createElement('div');
      expect(element.tagName).toBe('DIV');
    });

    it('should create element with className', () => {
      const element = createElement('div', 'test-class');
      expect(element.className).toBe('test-class');
    });

    it('should create element with textContent', () => {
      const element = createElement('div', '', 'test content');
      expect(element.textContent).toBe('test content');
    });

    it('should create element with className and textContent', () => {
      const element = createElement('div', 'test-class', 'test content');
      expect(element.className).toBe('test-class');
      expect(element.textContent).toBe('test content');
    });
  });

  describe('createElementWithHTML', () => {
    it('should create element with innerHTML', () => {
      const element = createElementWithHTML('div', 'container', '<p>Hello</p>');
      expect(element.className).toBe('container');
      expect(element.innerHTML).toBe('<p>Hello</p>');
    });
  });
});