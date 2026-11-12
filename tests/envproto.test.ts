import { describe, expect, it } from 'vitest';
import { decode, encode, envelope, keyHash } from '../src/lib/envproto';

describe('ENV transport', () => {
  it('derives the same key hash as the PHP gateway', () => {
    expect(keyHash('JiYan')).toBe(89);
  });

  it('matches a fixed PHP-generated vector', () => {
    const plain = 'action=web_card_query&card_key=TEST-1';
    expect(encode(plain, 'JiYan')).toBe(
      '6883788c6b5ed67e9d65948d6d916c99a486a77f84da79a8847c8876b18eca96a584b0bff8',
    );
  });

  it('round-trips UTF-8 payloads', () => {
    const plain = 'action=web_card_query&card_key=卡密-测试-001';
    expect(decode(encode(plain, 'JiYan'), 'JiYan')).toBe(plain);
  });

  it('changes the encoding with the uid', () => {
    expect(encode('a=1', 'alpha')).not.toBe(encode('a=1', 'beta'));
  });

  it('rejects malformed hex without throwing', () => {
    expect(decode('zz', 'JiYan')).toBe('');
    expect(decode('abc', 'JiYan')).toBe('');
  });

  it('builds an envelope with encoded query parameters', () => {
    const body = envelope('web_card_query', { card_key: 'A B&C', page: 2 });
    expect(body.developer_username).toBe('JiYan');
    expect(decode(body.data, 'JiYan')).toBe('action=web_card_query&card_key=A+B%26C&page=2');
  });
});
