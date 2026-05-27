export const queryKeys = {
  auth: {
    all: ['auth'],
    me: ['auth', 'me'],
  },
  invoices: {
    all: ['invoices'],
    list: ['invoices', 'list'],
    detail: (id) => ['invoices', 'detail', id],
  },
};
