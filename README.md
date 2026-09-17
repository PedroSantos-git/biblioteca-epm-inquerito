# Biblioteca Escolar EPM — Inquérito (mockup)

Protótipo visual (UI apenas, sem back-end) para o inquérito de satisfação da
Biblioteca Escolar da [Escola Profissional do Montijo](https://epmontijo.edu.pt),
baseado no [Google Forms original](https://docs.google.com/forms/d/1BG7qmKIpxKoxeYnZAw5Kzr4RBTaxSAEWOehCar7kEd0/edit).

Site estático (HTML/CSS/JS puro), sem dependências, sem base de dados e sem
envio de dados — o botão "Enviar respostas" é apenas decorativo.

## Estrutura

```
index.html      página única com o inquérito
styles.css      estilos (tema "biblioteca" moderno)
script.js       pequenas interações visuais (barra de progresso, botão)
assets/img/     logótipos
```

## Correr localmente

Não há build nem dependências. Basta abrir `index.html` no browser, ou:

```bash
npx serve .
```

## Deploy

Publicado no [Vercel](https://vercel.com) com deploy automático a partir do
GitHub (branch `main`) — sem configuração de build necessária (site estático).
