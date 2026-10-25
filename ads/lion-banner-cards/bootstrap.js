(() => {
      let started = false;
      const boot = () => {
        if (started) return;
        started = true;
        document.querySelector('.ad').classList.remove('is-fallback');
        const script = document.createElement('script');
        script.src = 'banner.js';
        script.onerror = () => document.querySelector('.ad').classList.add('is-fallback');
        document.body.append(script);
      };
      if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(entries => {
          if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); boot(); }
        }, { rootMargin: '80px' });
        observer.observe(document.querySelector('.ad'));
      } else boot();
    })();
