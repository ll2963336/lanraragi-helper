export default defineContentScript({
  matches: ['*://*.e-hentai.org/*', '*://*.exhentai.org/*'],
  main() {
    // 添加标记到元素
    function addMark(domId: string, link: string, mark: string, title: string) {
      const items = document.querySelectorAll('.itg.glte > tbody > tr');
      Array.from(items).forEach((item, index) => {
        if (index.toString() === domId) {
          // 给item添加position
          (item as HTMLElement).style.position = 'relative';

          // 根据标记设置背景色
          switch (mark) {
            case '⚠️':
              (item as HTMLElement).style.backgroundColor = 'rgba(255, 255, 0, 0.2)'; // 半透明黄色
              break;
            case '✅':
              (item as HTMLElement).style.backgroundColor = 'rgba(0, 255, 0, 0.2)'; // 半透明绿色
              break;
            case '❌':
              (item as HTMLElement).style.backgroundColor = 'rgba(255, 0, 0, 0.2)'; // 半透明红色
              break;
          }

          const titleEl = item.querySelector('.glink') as HTMLElement
          const div = document.createElement('div');
          div.setAttribute('style', 'color: #f7ff8e;margin-top:0.5rem;');
          div.textContent = title;
          titleEl?.appendChild(div);

          // 在item右下角添加两个按钮，一个点击后复制link，一个点击后复制titleEl的text
          const btnContainer = document.createElement('div');
          btnContainer.setAttribute('style', 'position: absolute; right: 0.4rem; bottom: 0.4rem;display: flex;flex-direction: column;gap: 0.8rem;');
          const button1 = document.createElement('button');
          button1.setAttribute('style', 'font-size: 20px;');
          button1.textContent = '复制链接';
          button1.addEventListener('click', () => {
            navigator.clipboard.writeText(link);
          });
          const button2 = document.createElement('button');
          button2.setAttribute('style', 'font-size: 20px;');
          button2.textContent = '复制标题';
          button2.addEventListener('click', () => {
            navigator.clipboard.writeText(titleEl?.innerText || '');
          });
          btnContainer.appendChild(button1);
          btnContainer.appendChild(button2);
          item.appendChild(btnContainer);
        }
      });
    }

    // 提取画廊信息
    function extractGalleryInfo() {
      const newItems = document.querySelectorAll('.itg.glte > tbody > tr');
      const galleryData = Array.from(newItems).map((item, index) => {
        const link = item.querySelector('a')?.href?.replace(/^https?:\/\//, '') || '';
        const title = item.querySelector('.glink')?.textContent || '';

        console.log(link);

        return {
          domId: index.toString(), // 使用索引作为ID
          link: link.trim(),
          title
        };
      });

      const filterGalleryData = galleryData.filter(item => item.link && item.title);

      chrome.runtime.sendMessage({
        type: 'galleryData',
        data: filterGalleryData
      }, response => {
        console.log('Background response:', response);
      });
    }

    // 监听来自background的标记指令
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'addMark') {
        addMark(message.domId, message.link, message.mark, message.title);
        sendResponse({ success: true });
      }
      return true;
    });

    // 初始化
    extractGalleryInfo();
  },
});
