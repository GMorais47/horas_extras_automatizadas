const env = {
    tolerancia: Number(process.env.TOLERANCIA || 0),
    preco_por_minuto: Number(process.env.VALOR_HORA || 0)/60,
    dispositivo: {
        ip: process.env.DISPOSITIVO_IP,
        usuario: process.env.DISPOSITIVO_USUARIO,
        senha: process.env.DISPOSITIVO_SENHA,
    }
}

export default {
    env
}