export const queryKeys = {
  auth: {
    all: ['auth'],
    me: ['auth', 'me'],
  },
  admin: {
    all: ['admin'],
    auth: {
      all: ['admin', 'auth'],
      me: ['admin', 'auth', 'me'],
    },
    users: {
      all: ['admin', 'users'],
      list: (params) => ['admin', 'users', 'list', params],
    },
  },
  invoices: {
    all: ['invoices'],
    list: (page, limit) => ['invoices', 'list', { page, limit }],
    detail: (id) => ['invoices', 'detail', id],
  },
};
