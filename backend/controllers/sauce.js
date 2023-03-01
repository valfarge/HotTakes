const Sauce = require("../models/Sauce");
const fs = require("fs");
const { log } = require("console");

exports.displayAllSauces = (req, res, next) => {
  // find() permet de récuperer toutes les sauces dans l'api et des les envoyer au frontend
  Sauce.find()
    .then((sauces) => res.status(200).json(sauces))
    .catch((error) => res.status(400).json({ error }));
};

exports.displayOneSauce = (req, res, next) => {
  // findOne() permet de récuperer une sauce dans l'api à l'aide du filtre et de l'envoyer au frontend
  Sauce.findOne({ _id: req.params.id })
    .then((sauce) => res.status(200).json(sauce))
    .catch((error) => res.status(404).json({ error }));
};

exports.createSauce = async (req, res, next) => {
  // On récupère la sauce présente dans le body et on la parse
  const sauceObject = JSON.parse(req.body.sauce);
  // ne pas faire confiance au client
  delete sauceObject.userId;
  // on créé une const sauce grace à sauceObject + on rajoute les champs manquant userId et imageUrl, _id est créé par mongoose.
  const sauce = new Sauce({
    ...sauceObject,
    userId: req.auth.userId,
    // on utilise l'url créé avec multer
    imageUrl: `${req.protocol}://${req.get("host")}/images/${
      req.file.filename
    }`,
  });

  // on sauvegarde la sauce comme résultat dans l'api
  try {
    sauce.save();
    res.status(201).json({ message: "Sauce enregistrée !" });
  } catch (error) {
    res.status(400).json({ error });
  }
};

exports.modifySauce = (req, res, next) => {
  let newImage = false;
  let sauceObject = {};

  // verifie si un file (image) est présent dans la requete
  if (req.file) {
    newImage = true;
    sauceObject = {
      ...JSON.parse(req.body.sauce),
      imageUrl: `${req.protocol}://${req.get("host")}/images/${
        req.file.filename
      }`,
    };
  } else {
    sauceObject = { ...req.body };
  }
  //on supprime l'userId pour des questions de sécurité
  delete sauceObject.userId;

  Sauce.findOne({ _id: req.params.id })
    .then((sauce) => {
      // on vérifie si l'user à le droit d'effectuer la modification
      if (sauce.userId != req.auth.userId) {
        res.status(401).json({ message: "Not authorized" });
      } else {
        switch (newImage) {
          // si changement d'image alors on supprime l'ancienne image présente dans le dossier image puis on update
          case true:
            const filename = sauce.imageUrl.split("/images/")[1];
            // on supprime l'image de repository images/ gràce à fs
            fs.unlink(`images/${filename}`, () => {
              // on supprime la sauce de l'api grace à deleteOne()
              Sauce.updateOne(
                { _id: req.params.id },
                // on update les objets présent dans sauceObject
                { ...sauceObject }
              )
                .then(() =>
                  res.status(200).json({ message: "Sauce modifiée!" })
                )
                .catch((error) => res.status(401).json({ error }));
            });
            break;
          // si pas de changement d'image alors on update
          case false:
            Sauce.updateOne(
              { _id: req.params.id },
              // on update les objets présent dans sauceObject
              { ...sauceObject }
            )
              .then(() => res.status(200).json({ message: "Sauce modifiée!" }))
              .catch((error) => res.status(401).json({ error }));
            break;
        }
      }
    })
    .catch((error) => {
      res.status(400).json({ error });
    });
};

exports.deleteSauce = (req, res, next) => {
  // on filtre la sauce grace à l'id de l'url
  Sauce.findOne({ _id: req.params.id })
    .then((sauce) => {
      // on verifie s'il s'agit bien du bon user
      if (sauce.userId != req.auth.userId) {
        res.status(401).json({ message: "Not authorized" });
      } else {
        //si il s'agit du bon user, on récupère le nom de l'image grace à split()
        const filename = sauce.imageUrl.split("/images/")[1];
        // on supprime l'image de repository images/ gràce à fs
        fs.unlink(`images/${filename}`, () => {
          // on supprime la sauce de l'api grace à deleteOne()
          Sauce.deleteOne({ _id: req.params.id })
            .then(() => {
              res.status(200).json({ message: "Sauce supprimée !" });
            })
            .catch((error) => res.status(401).json({ error }));
        });
      }
    })
    .catch((error) => {
      res.status(500).json({ error });
    });
};
//methode pour liker ou disliker sauces
exports.likeToggleSauce = (req, res, next) => {
  Sauce.findOne({ _id: req.params.id }).then((objet) => {
    if (!objet.usersLiked.includes(req.body.userId) && req.body.like === 1) {
      Sauce.updateOne(
          //On récupère la sauce par son id
        { _id: req.params.id },
        {
          $inc: { likes: 1 },
           //On ajoute l'id de l'utilisateur dans le tableau ...
           //...de ceux ayant liké la sauce et on incrémente le nombre de likes de 1
          $push: { usersLiked: req.body.userId },
        }
      )
        .then(() => res.status(200).json({ message: "like ajouté" }))
        .catch((error) => res.status(404).json({ error }));
    }
    //Annulation du like : si  l'utilisateur a déjà liké la sauce,....
    //... on le retire du tableau des utilisateurs ayant liké la sauce et on décrémente le nombre de likes de 1
    if (objet.usersLiked.includes(req.body.userId) && req.body.like === 0) {
      Sauce.updateOne(
          //On récupère la sauce par son id
        { _id: req.params.id },
        {
          $inc: { likes: -1 },
          $pull: { usersLiked: req.body.userId },
        }
      )
        .then(() => res.status(200).json({ message: "like annulé" }))
        .catch((error) => res.status(404).json({ error }));
    }
    //Disliker une sauce
    if (
      !objet.usersDisliked.includes(req.body.userId) && req.body.like === -1) {
      Sauce.updateOne(
          //On récupère la sauce par son id
        { _id: req.params.id },
        {
          $inc: { dislikes: 1 },
          //On ajoute l'id de l'utilisateur dans le tableau ...
          //...de ceux ayant disliké la sauce et on incrémente le nombre de dislike de 1
          $push: { usersDisliked: req.body.userId },
        }
      )
        .then(() => res.status(200).json({ message: "dislike ajouté" }))
        .catch((error) => res.status(404).json({ error }));
    }  
    //Annulation du dislike / si l'utilisateur a déjà disliké la sauce, on le retire ...
    //...du tableau des utilisateurs ayant disliké la sauce et on décrémente le nombre de like de 1
    if (objet.usersDisliked.includes(req.body.userId) && req.body.like === 0) {
      Sauce.updateOne(
          //On récupère la sauce par son id
        { _id: req.params.id },
        {
          $inc: { dislikes: -1 },
          $pull: { usersDisliked: req.body.userId },
        }
      )
        .then(() => res.status(200).json({ message: "dislike annulé" }))
        .catch((error) => res.status(404).json({ error }));
    }
  });
};
