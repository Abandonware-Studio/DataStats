const defaultNbSites = 10;
let userNbSitesDisplayed = defaultNbSites;

const refresh = 500;

let statsInterval;
let pieChart;

parseStats = () => {
  const stats = localStorage.getItem('stats');
  return null === stats ? {} : JSON.parse(stats);
}

getStats = () => {
  const stats = parseStats();
  let total = 0;
  const sortedStats = [];

  for (let origin in stats) {
    total += stats[origin];
    sortedStats.push({ 'origin': origin, 'byte': stats[origin] });
  }

  sortedStats.sort(function (a, b) {
    return a.byte < b.byte ? 1 : a.byte > b.byte ? -1 : 0
  });

  const highestStats = sortedStats.slice(0, userNbSitesDisplayed - 1);
  let subtotal = 0;
  for (let index in highestStats) {
    subtotal += highestStats[index].byte;
  }

  if (total > 0) {
    const remaining = total - subtotal;
    if (remaining > 0) {
      highestStats.push({ 'origin': translate('statsOthers'), 'byte': remaining });
    }

    highestStats.forEach(function (item) {
      item.percent = Math.round(100 * item.byte / total)
    });
  }

  return {
    'total': total,
    'highestStats': highestStats
  }
}

toMegaByte = (value) => (Math.round(value / 1024 / 1024));

showStats = () => {
  const stats = getStats();

  if (stats.total === 0) {
    return;
  }

  show(statsElement);
  const labels = [];
  const series = [];

  const statsListItemsElement = document.getElementById('statsListItems');
  while (statsListItemsElement.firstChild) {
    statsListItemsElement.removeChild(statsListItemsElement.firstChild);
  }

  for (let index in stats.highestStats) {
    if (stats.highestStats[index].percent < 1) {
      continue;
    }

    labels.push(stats.highestStats[index].origin);
    series.push(stats.highestStats[index].percent);
    const text = document.createTextNode(`${stats.highestStats[index].percent}% ${stats.highestStats[index].origin}`);
    const li = document.createElement("LI");
    li.appendChild(text);
    statsListItemsElement.appendChild(li);
  }

  let duration = localStorage.getItem('duration');
  duration = null === duration ? 0 : duration;

  if (!pieChart) {
    pieChart = new Chartist.Pie('.ct-chart', { labels, series }, {
      donut: true,
      donutWidth: 60,
      donutSolid: true,
      startAngle: 270,
      showLabel: false
    });
  } else {
    pieChart.update({ labels, series });
  }

  const megaByteTotal = toMegaByte(stats.total);
  document.getElementById('duration').textContent = duration.toString();
  document.getElementById('mbTotalValue').textContent = megaByteTotal;
}

start = () => {
  chrome.runtime.sendMessage({ action: 'start' });

  hide(startButton);
  show(stopButton);
  show(analysisInProgressMessage);
  localStorage.setItem('analysisStarted', '1');
}

stop = () => {
  chrome.runtime.sendMessage({ action: 'stop' });

  hide(stopButton);
  show(startButton);
  hide(analysisInProgressMessage);
  clearInterval(statsInterval);
  localStorage.removeItem('analysisStarted');
}

reset = () => {
  if (!confirm(translate('resetConfirmation'))) {
    return;
  }

  localStorage.removeItem('stats');
  localStorage.removeItem('duration');
  hide(statsElement);
  showStats();
  hide(resetButton);
}

init = () => {

  const valueNbSites = localStorage.getItem('nbSitesToDisplay');

  if (null !== valueNbSites) {
    userNbSitesDisplayed = valueNbSites;
    nbSitesField.value = valueNbSites;
  }

  if (null === localStorage.getItem('stats')) {
    hide(resetButton);
  } else {
    show(resetButton);
  }

  showStats();

  if (null === localStorage.getItem('analysisStarted')) {
    return;
  }

  start();
  statsInterval = setInterval(showStats, 'refresh');
}

nbSitesFieldHandler = (event) => {
  const valueNbSites = event.target.value;

  localStorage.setItem('nbSitesToDisplay', valueNbSites);
  userNbSitesDisplayed = valueNbSites;
  showStats();
}

translate = (translationKey) => {
  return chrome.i18n.getMessage(translationKey);
}

translateText = (target, translationKey) => {
  target.appendChild(document.createTextNode(translate(translationKey)));
}

translateHref = (target, translationKey) => {
  target.href = chrome.i18n.getMessage(translationKey);
}

hide = element => element.classList.add('hidden');
show = element => element.classList.remove('hidden');

const analysisInProgressMessage = document.getElementById('analysisInProgressMessage');

const statsElement = document.getElementById('stats');

const startButton = document.getElementById('startButton');
startButton.addEventListener('click', start);

const stopButton = document.getElementById('stopButton');
stopButton.addEventListener('click', stop);

const resetButton = document.getElementById('resetButton');
resetButton.addEventListener('click', reset);

const nbSitesField = document.getElementById('statsNbSitesDisplayed');
nbSitesField.addEventListener('change', nbSitesFieldHandler);

document.querySelectorAll('[translate]').forEach(function (element) {
  translateText(element, element.getAttribute('translate'));
});

document.querySelectorAll('[translate-href]').forEach(function (element) {
  translateHref(element, element.getAttribute('translate-href'));
});

init();
