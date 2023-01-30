// package de cryptage de mdp
const bcrypt = require("bcrypt");

const jwt = require("jsonwebtoken");

const User = require("../models/User");

require("dotenv").config();

exports.signup = (req, res, next) => {
  bcrypt
    //methode asynchrone qui hash le mdp
    .hash(req.body.password, 10) // hash le mdp 10 fois
    .then((hash) => {
      // on créé un nouvel user grace au hash et à l'email
      const user = new User({ email: req.body.email, password: hash });
      user
        .save() // on sauvegarde l'user dans la base de donnée
        .then(() => {
          res.status(201).json({ message: "Utilisateur créé !" });
        })
        .catch((error) => res.status(400).json({ error }));
    })
    .catch((error) => res.status(500).json({ error }));
};
exports.login = (req, res, next) => {
  User.findOne({ email: req.body.email }) // objet de filtrage
    .then((user) => {
      // on verifie si user === null
      if (!user) {
        return (
          res
            .status(401)
            // on ne met pas de message précisant que l'user n'existe pas pour des qst de sécu
            .json({ message: "Paire login/mot de passe incorrecte" })
        );
      }
      bcrypt
        // compare mdp fourni et celui de la base de donnée
        .compare(req.body.password, user.password) // retourne false ou true
        .then((valid) => {
          // si false
          if (!valid) {
            return res
              .status(401)
              .json({ message: "Paire login/mot de passe incorrecte" });
          } else {
            // si vrai
            res.status(200).json({
              userId: user._id,
              // encode l'userId
              token: jwt.sign({ userId: user._id }, `${process.env.TOKEN}`, {
                expiresIn: "24h",
              }),
            });
          }
        })
        .catch((error) => res.status(500).json({ error }));
    })
    .catch((error) => res.status(500).json({ error }));
};