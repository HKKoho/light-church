// Small WordPress-style pages shaped like a typical church site.
export const ORIGIN = 'https://www.example-church.org';

const nav = `
<nav id="site-navigation" class="main-navigation" role="navigation">
  <ul class="menu">
    <li><a href="/">首頁</a></li>
    <li><a href="/about/">關於我們</a>
      <ul class="dropdown-menu">
        <li><a href="/about/">關於我們</a></li>
        <li><a href="/about/faith/">基本信仰</a></li>
        <li><a href="/about/history/">歷史</a>
          <ul><li><a href="/about/history/1990/">1990</a></li></ul>
        </li>
      </ul>
    </li>
    <li><a href="/%e8%81%af%e7%b5%a1/">聯絡我們</a></li>
    <li><a href="https://www.youtube.com/@church">直播</a></li>
  </ul>
</nav>`;

export const page = (title: string, body: string) => `<!doctype html>
<html><head>
  <title>${title} - Example Church</title>
  <meta property="og:site_name" content="Example Church">
  <meta name="description" content="A church in the city">
</head><body>
  <a class="skip-link" href="#primary">Skip to content</a>
  <header><img class="custom-logo" src="/wp-content/uploads/logo.png" alt="Example Church"></header>
  ${nav}
  <main id="primary"><article>
    <h1>${title}</h1>
    ${body}
  </article></main>
  <footer><p>© Example Church</p><a href="mailto:hello@example-church.org">Email</a>
  <a href="tel:+85212345678">Call</a></footer>
</body></html>`;

export const HOME = page(
  '首頁',
  `<p>Welcome to our church. Sunday worship is at 10:30am every week, and all are welcome to join us.</p>
   <p><a href="/about/faith/">Read what we believe</a> or <a href="/files/bulletin.pdf">download the bulletin</a>.</p>
   <p><img src="/wp-content/uploads/banner.jpg" alt="Banner"></p>`,
);
