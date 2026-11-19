// Tests for the shared contact-detail checks used on post and reply text.
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  hasContactDetails,
  hasEmail,
  hasHandle,
  hasPhoneOrLink,
} from '../../tools/gbp/text-rules.js';

const PLAIN = [
  'Fresh loaves today',
  'Menu voor € 34,50 p.p. Bestel uiterlijk 20 december, tussen 15:00 en 17:00. Tot 2027!',
  'Thanks for the kind words, see you soon',
  'Dank je wel, tot snel',
  'See you @ the bakery',
];

describe('hasPhoneOrLink', () => {
  for (const text of [
    'Bestel nu: bel 020 123 4567.',
    'Bel 020-123 4567',
    'Call +31 20 123 4567 today',
    'Bel 06 1234 5678',
    'Kijk op https://example.com/kerst',
    'Kijk op www.example.com',
  ]) {
    it(`finds "${text}"`, () => assert.equal(hasPhoneOrLink(text), true));
  }
  for (const text of PLAIN) {
    it(`passes "${text}"`, () => assert.equal(hasPhoneOrLink(text), false));
  }
});

describe('hasEmail', () => {
  for (const text of ['Mail hello@example.com', 'mail ons: info.desk@example.co.uk']) {
    it(`finds "${text}"`, () => assert.equal(hasEmail(text), true));
  }
  for (const text of PLAIN) {
    it(`passes "${text}"`, () => assert.equal(hasEmail(text), false));
  }
});

describe('hasHandle', () => {
  for (const text of [
    'Follow @examplebakery',
    'Volg ons op @example.studio!',
    'Zie instagram.com/examplebakery',
    'facebook.com/examplebakery',
    'tiktok.com/@examplebakery',
  ]) {
    it(`finds "${text}"`, () => assert.equal(hasHandle(text), true));
  }
  it('does not treat an email as a handle', () => {
    assert.equal(hasHandle('hello@example.com'), false);
  });
  it('needs two word characters after the at sign', () => {
    assert.equal(hasHandle('table @a'), false);
  });
  for (const text of PLAIN) {
    it(`passes "${text}"`, () => assert.equal(hasHandle(text), false));
  }
});

describe('hasContactDetails', () => {
  for (const text of [
    'Bel 020 123 4567',
    'https://example.com',
    'hello@example.com',
    'Follow @examplebakery',
    'instagram.com/examplebakery',
  ]) {
    it(`finds "${text}"`, () => assert.equal(hasContactDetails(text), true));
  }
  for (const text of PLAIN) {
    it(`passes "${text}"`, () => assert.equal(hasContactDetails(text), false));
  }
  it('treats missing text as clean', () => {
    assert.equal(hasContactDetails(undefined), false);
  });
});
