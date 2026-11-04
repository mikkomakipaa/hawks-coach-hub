/**
 * FormField — label + input + hint/error wrapper
 *
 * Wraps any input element (text, select, textarea) in a consistent
 * label / hint / error layout.
 */

export interface FormFieldOptions {
  label: string;
  input: HTMLElement;
  hint?: string;
  error?: string;
  required?: boolean;
  id?: string;
}

export function createFormField(options: FormFieldOptions): HTMLElement {
  const { label, input, hint, error, required = false, id } = options;

  const fieldId = id ?? `field-${Math.random().toString(36).slice(2, 8)}`;

  const field = document.createElement('div');
  field.className = error ? 'ui-field ui-field--error' : 'ui-field';

  const labelEl = document.createElement('label');
  labelEl.className = 'ui-field__label';
  labelEl.htmlFor = fieldId;
  labelEl.textContent = label;

  if (required) {
    const req = document.createElement('span');
    req.className = 'ui-field__required';
    req.textContent = ' *';
    req.setAttribute('aria-hidden', 'true');
    labelEl.appendChild(req);
  }

  field.appendChild(labelEl);

  // Attach the fieldId so the label's `for` resolves
  if (
    input instanceof HTMLInputElement ||
    input instanceof HTMLSelectElement ||
    input instanceof HTMLTextAreaElement
  ) {
    input.id = fieldId;
  }

  field.appendChild(input);

  if (hint && !error) {
    const hintEl = document.createElement('p');
    hintEl.className = 'ui-field__hint';
    hintEl.textContent = hint;
    field.appendChild(hintEl);
  }

  if (error) {
    const errorEl = document.createElement('p');
    errorEl.className = 'ui-field__error';
    errorEl.textContent = error;
    errorEl.setAttribute('role', 'alert');
    field.appendChild(errorEl);
  }

  return field;
}
