import fetch from 'node-fetch';

const JSON_SERVER_BASE = process.env.JSON_SERVER_URL || 'http://localhost:4000';

export const create = async (collection, payload) => {
  const res = await fetch(`${JSON_SERVER_BASE}/${collection}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
};

export const list = async (collection, params = '') => {
  const res = await fetch(`${JSON_SERVER_BASE}/${collection}${params}`);
  return res.json();
};

export const getById = async (collection, id) => {
  const res = await fetch(`${JSON_SERVER_BASE}/${collection}/${id}`);
  return res.json();
};

export const update = async (collection, id, payload) => {
  const res = await fetch(`${JSON_SERVER_BASE}/${collection}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
};
