const User = require("../models/User.model");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
require("dotenv").config();

module.exports.userController = {
  signUp: async (req, res) => {
    try {
      const { name, login, password } = req.body;
      const result = await User.findOne({ login });

      if (!name) {
        return res.json({
          error: "Вы не ввели имя",
        });
      }

      if (!login) {
        return res.json({
          error: "Придумайте логин",
        });
      }

      if (!password) {
        return res.json({
          error: "Придумайте пароль",
        });
      }

      if (result) {
        return res.json({
          error: "Пользователь с таким логином уже существует",
        });
      }
      const hash = await bcrypt.hash(password, Number(process.env.BCRYPT_SEC));
      const user = await User.create({ name, login, password: hash });

      const payload = {
        name: user.name,
        id: user._id,
      };

      const token = await jwt.sign(payload, process.env.SECRET_JWT_KEY, {
        expiresIn: "24h",
      });

      return res.json(token);
    } catch (error) {
      res.json(error + "Ошибка при регистрации.");
    }
  },

  signIn: async (req, res) => {
    const { login, password } = req.body;
    const candidate = await User.findOne({ login });

    if (login === "") {
      return res.status(401).json({ error: "Вы не ввели имя" });
    }
    if (!candidate) {
      return res.status(401).json({ error: "Неверный логин" });
    }

    const valid = await bcrypt.compare(password, candidate.password);
    if (password === "") {
      return res.status(401).json({ error: "Вы не ввели пароль" });
    }
    if (!valid) {
      return res.status(401).json({ error: "Неверный пароль" });
    }

    const payload = {
      name: candidate.name,
      id: candidate._id,
    };

    const token = await jwt.sign(payload, process.env.SECRET_JWT_KEY, {
      expiresIn: "24h",
    });
    return res.json(token);
  },
  addInCart: async (req, res) => {
    const { product, count } = req.body;
    const productId = product._id;
    const { id } = req.user;
    const findUser = await User.findById(id);
    const userCart = findUser.cart;
    const findProduct = userCart.filter((item) => {
      return item.productId.toString() === product._id;
    });
    try {
      if (findProduct.length === 0) {
        const cart = await User.findByIdAndUpdate(id, {
          $push: { cart: { productId, count } },
        });
        const user = await User.findById(id).populate("cart.productId");
        return res.json(user.cart);
      }
      return res.json({ error: "Товар есть уже в корзине" });
    } catch (error) {
      return res.json(error + " Ошибка при добавлении продукта в корзину.");
    }
  },

  removeProductInCart: async (req, res) => {
    const { id } = req.user;
    const { productId } = req.body;
    try {
      const findUser = await User.findById(id);

      const findInUserCart = findUser.cart.filter((product) => {
        return product.productId.toString() !== productId;
      });
      await User.findByIdAndUpdate(id, {
        cart: [...findInUserCart],
      });
      const user = await User.findById(id).populate("cart.productId");
      return res.json(user.cart);
    } catch (error) {
      return res.json(error + " Ошибка удаления из корзины");
    }
  },

  getInCart: async (req, res) => {
    const { id } = req.user;
    const { local } = req.body;
    try {
      const findUser = await User.findById(id);
      const userCart = findUser.cart;
      const findInUserCart = local.filter((product) => {
        const find = userCart.filter((item) => {
          return item.productId.toString() === product._id;
        });
        if (find.length === 0) {
          return product;
        }
        return product === 0;
      });
      if (findInUserCart.length > 0) {
        const cartFilter = findInUserCart.map((item) => {
          return {
            productId: item._id,
            count: item.count,
          };
        });
        await User.findByIdAndUpdate(id, {
          cart: [...userCart, ...cartFilter],
        });
        const findUserCart = await User.findById(id).populate("cart.productId");
        return res.json(findUserCart.cart);
      }
      const user = await User.findById(id).populate("cart.productId");
      return res.json(user.cart);
    } catch (error) {
      return res.json(error + "Отображение корзины невозможно");
    }
  },
  toUpYourAccount: async (req, res) => {
    const { id } = req.user;
    const { sum } = req.body;
    try {
      const user = await User.findById(id);
      user.capital = sum + user.capital;
      await user.save();
      return res.json("Счет пополнен.");
    } catch (error) {
      return res.json(error);
    }
  },
};
