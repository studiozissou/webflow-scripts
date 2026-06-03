/**
 * Quiz Data — reads questions and result bands from CMS collection lists
 * and exposes them on window.__quizData for the React quiz component.
 */
(() => {
  const DEBUG = false;

  const questionWrap = document.querySelector("[data-quiz='questions']");
  if (!questionWrap) return;

  const qItems = questionWrap.querySelectorAll('.w-dyn-item');
  const questions = [];
  qItems.forEach((el) => { questions.push(el.textContent.trim()); });

  const rItems = document.querySelectorAll("[data-quiz='results'] .w-dyn-item");
  const results = [];
  rItems.forEach((el) => {
    const name = el.querySelector("[data-field='title']");
    const desc = el.querySelector("[data-field='description']");
    const min = el.querySelector("[data-field='min']");
    const max = el.querySelector("[data-field='max']");
    results.push({
      min: parseInt(min?.textContent, 10) || 0,
      max: parseInt(max?.textContent, 10) || 0,
      heading: name?.textContent?.trim() || '',
      body: desc?.textContent?.trim() || '',
    });
  });

  window.__quizData = { questions, results };
  window.dispatchEvent(new Event('quizDataReady'));

  DEBUG && console.log('[quiz-data]', window.__quizData);
})();
