import { Router } from 'express';

const router = Router();

// Serve the bedtime screen
router.get('/bedtime', (_req, res) => {
  const html = generateBlockScreen({
    emoji: '🌙',
    title: "It's Bedtime!",
    subtitle: 'Time to rest. See you in the morning!',
    theme: 'night',
  });
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

// Serve the daily limit reached screen
router.get('/limit', (_req, res) => {
  const html = generateBlockScreen({
    emoji: '⏰',
    title: 'Screen Time Limit Reached',
    subtitle: "You've used all your screen time for today. See you tomorrow!",
    theme: 'sunset',
  });
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

interface BlockScreenOptions {
  emoji: string;
  title: string;
  subtitle: string;
  theme: 'night' | 'sunset';
}

function generateBlockScreen({ emoji, title, subtitle, theme }: BlockScreenOptions): string {
  const gradient = theme === 'night'
    ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
    : 'linear-gradient(135deg, #ff6b35 0%, #f7931e 30%, #9b59b6 70%, #3498db 100%)';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    html, body {
      height: 100%;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    body {
      background: ${gradient};
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #e8e8e8;
      text-align: center;
      user-select: none;
    }

    .icon {
      font-size: 150px;
      margin-bottom: 40px;
      animation: float 3s ease-in-out infinite;
    }

    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-20px); }
    }

    .stars {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: -1;
    }

    .star {
      position: absolute;
      width: 4px;
      height: 4px;
      background: white;
      border-radius: 50%;
      animation: twinkle 2s ease-in-out infinite;
    }

    @keyframes twinkle {
      0%, 100% { opacity: 0.3; }
      50% { opacity: 1; }
    }

    h1 {
      font-size: 72px;
      font-weight: 300;
      margin-bottom: 24px;
      letter-spacing: 2px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
    }

    p {
      font-size: 32px;
      opacity: 0.9;
      font-weight: 300;
      max-width: 800px;
      line-height: 1.4;
    }

    /* Prevent any interaction */
    body::after {
      content: '';
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 9999;
    }
  </style>
</head>
<body>
  <div class="stars" id="stars"></div>
  <div class="icon">${emoji}</div>
  <h1>${title}</h1>
  <p>${subtitle}</p>

  <script>
    // Generate random stars
    const starsContainer = document.getElementById('stars');
    for (let i = 0; i < 50; i++) {
      const star = document.createElement('div');
      star.className = 'star';
      star.style.left = Math.random() * 100 + '%';
      star.style.top = Math.random() * 100 + '%';
      star.style.animationDelay = Math.random() * 2 + 's';
      star.style.width = (Math.random() * 3 + 2) + 'px';
      star.style.height = star.style.width;
      starsContainer.appendChild(star);
    }

    // Prevent navigation
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', () => {
      window.history.pushState(null, '', window.location.href);
    });

    // Disable keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    });
  </script>
</body>
</html>`;
}

export default router;
