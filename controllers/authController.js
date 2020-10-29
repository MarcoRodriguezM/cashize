// Importar los módulos requeridos
const passport = require("passport");
const mongoose = require("mongoose");
const crypto = require("crypto");
const Usuario = mongoose.model("Usuarios");
const enviarCorreo = require("../handlers/email");
const { send } = require("process");

// Se encarga de autenticar el usuario y de redireccionarlo
exports.autenticarUsuario = passport.authenticate("local", {
  successRedirect: "/administrar",
  failureRedirect: "/iniciar-sesion",
  failureFlash: true,
  badRequestMessage: ["Debes ingresar tus credenciales"],
});

// Cerrar la sesión del usuario
exports.cerrarSesion = (req, res, next) => {
  // Cierra la sesión
  req.logout();

  req.flash("success", [
    "Has cerrado correctamente tu sesión. ¡Vuelve pronto!",
  ]);

  return res.redirect("/iniciar-sesion");
};

// Mostrar el formulario de restablecer la contraseña
exports.formularioRestablecerPassword = (req, res, next) => {
  res.render("restablecerPassword", {
    layout: "auth",
    typePage: "register-page",
    signButtonValue: "/iniciar-sesion",
    signButtonText: "Iniciar sesión",
    year: new Date().getFullYear(),
    messages: req.flash(),
  });
};

// Enviamos un token de autenticación al usuario para cambiar su
// contraseña. El token se envía al correo del usuario.
exports.enviarToken = async (req, res, next) => {
  // Obtener la direccción de correo electrónico
  const { email } = req.body;
  const messages = { messages: [] };

  // Buscar el usuario
  try {
    const usuario = await Usuario.findOne({ email });

    // El usuario no existe
    if (!usuario) {
      messages.messages.push({
        message:
          "¡No existe una cuenta registrado con este correo electrónico!",
        alertType: "danger",
      });

      req.flash(messages);

      res.redirect("/olvide-password");
    }

    // El usuario existe, generar un token y una fecha de vencimiento
    usuario.token = crypto.randomBytes(20).toString("hex");
    usuario.expira = Date.now() + 3600000;

    // Guardar los cambios
    await usuario.save();

    // Generar la URL de restablecer contraseña
    const resetUrl = `http://${req.headers.host}/olvide-password/${usuario.token}`;

    try {
      // Enviar la notificación al correo electrónico del usuario
      const sendMail = await enviarCorreo.enviarCorreo({
        to: usuario.email,
        subject: "Restablece tu contraseña en Cashize",
        template: "resetPassword",
        nombre: usuario.nombre,
        resetUrl,
      });
    } catch (error) {
      console.log(error);
    }

    // Redireccionar al inicio de sesión
    messages.messages.push({
      message: "¡Verifica tu bandeja de entrada y sigue las instrucciones!",
      alertType: "success",
    });

    req.flash(messages);

    res.redirect("/iniciar-sesion");
  } catch (error) {
    messages.messages.push({
      message:
        "Ocurrió un error al momento de comunicarse con el servidor. Favor intentar nuevamente.",
      alertType: "danger",
    });

    req.flash(messages);
  }
};
