import User from '../models/User.js';

const clampInt = (value, { min, max, fallback }) => {
  const n = Number.parseInt(String(value), 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

export const listUsers = async (req, res) => {
  try {
    const page = clampInt(req.query.page, { min: 1, max: 100000, fallback: 1 });
    const limit = clampInt(req.query.limit, { min: 1, max: 100, fallback: 10 });
    const q = String(req.query.q || '').trim();
    const status = String(req.query.status || 'all').toLowerCase(); // all | active | disabled
    const role = String(req.query.role || 'user').toLowerCase(); // all | user | admin
    const sort = String(req.query.sort || '-createdAt'); // createdAt | -createdAt | name | -name

    const filter = {};

    if (q) {
      filter.$or = [{ name: { $regex: q, $options: 'i' } }, { email: { $regex: q, $options: 'i' } }];
    }

    if (status === 'active') filter.isDisabled = false;
    if (status === 'disabled') filter.isDisabled = true;

    if (role === 'user') filter.role = 'user';
    if (role === 'admin') filter.role = 'admin';

    const skip = (page - 1) * limit;

    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .select('name email role isDisabled createdAt updatedAt')
        .sort(sort)
        .skip(skip)
        .limit(limit),
    ]);

    const pages = Math.max(1, Math.ceil(total / limit));

    return res.status(200).json({
      success: true,
      data: {
        users: users.map((u) => ({
          id: u._id,
          name: u.name,
          email: u.email,
          role: u.role,
          isDisabled: u.isDisabled,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
        })),
        pagination: { page, limit, total, pages },
      },
    });
  } catch (error) {
    console.error('List users error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

export const setUserDisabled = async (req, res) => {
  try {
    const { id } = req.params;
    const { disabled } = req.body;

    if (typeof disabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'disabled must be boolean',
      });
    }

    if (String(id) === String(req.admin.id)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot disable your own admin account',
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.isDisabled = disabled;
    await user.save();

    return res.status(200).json({
      success: true,
      message: disabled ? 'User disabled' : 'User enabled',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isDisabled: user.isDisabled,
        },
      },
    });
  } catch (error) {
    console.error('Disable user error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

