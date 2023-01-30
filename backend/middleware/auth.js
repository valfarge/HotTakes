const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  try {
    // on récupère le token on split bearer avec le token
    const token = req.headers.authorization.split(" ")[1];
    // on décode le token grace à verify
    const decodedToken = jwt.verify(token, process.env.TOKEN);
    //on récupère l'userId retourné par verify
    const userId = decodedToken.userId;
    // on ajoute l'userId à la requete afin qu'il puisse être utilisé par les controllers/midlleware
    req.auth = {
      userId: userId,
    };

    next();
  } catch (error) {
    res.status(401).json({ error });
  }
};