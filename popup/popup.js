const defaultGeolocation = 'regionEuropeanUnion';
const userGeolocation = defaultGeolocation;

const kWhPerByte = 0.00000000152;
const OneKWhEquivalentKmByCar = 2.4;
const OneKWhEquivalentChargedSmartphones = 63;

const carbonIntensityFactorInKgCO2ePerKWh = {
  'regionEuropeanUnion': '0.276',
  'regionUnitedStates': '0.493',
  'regionChina': '0.681',
  'regionOther': '0.519'
};

let statsInterval;
let pieChart;

handleResponse = message => {
  console.log(`${message.response}`);
}

handleError = error => console.log(`Error: ${error}`);

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

  sortedStats.sort(function(a, b) {
    return a.byte < b.byte ? 1 : a.byte > b.byte ? -1 : 0
  });

  const highestStats = sortedStats.slice(0, 9);
  let subtotal = 0;
  for (let index in highestStats) {
    subtotal += highestStats[index].byte;
  }

  if (total > 0) {
    const remaining = total - subtotal;
    if (remaining > 0) {
      highestStats.push({'origin': 'Others', 'byte': remaining});
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

toMegaByte = (value) => (Math.round(100 * value/1024/1024) / 100);

showStats = () => {
  const stats = getStats();

  let kWhTotal = 0;
  let kmByCar = 0;
  let chargedSmartphones = 0;
  let kgCO2e = 0;

  if (stats.total > 0) {
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

      labels.push(stats.highestStats[index].percent > 40 ? stats.highestStats[index].origin : ' ');
      series.push(stats.highestStats[index].percent);
      const text = document.createTextNode(`${stats.highestStats[index].percent}% ${stats.highestStats[index].origin}`);
      const li = document.createElement("LI");
      li.appendChild(text);
      statsListItemsElement.appendChild(li);
    }

    kWhTotal = Math.round(1000 * stats.total * kWhPerByte) / 1000;
    kmByCar = Math.round(1000 * kWhTotal * OneKWhEquivalentKmByCar) / 1000;
    chargedSmartphones = Math.round(kWhTotal * OneKWhEquivalentChargedSmartphones);
    kgCO2e = Math.round(1000 * kWhTotal * carbonIntensityFactorInKgCO2ePerKWh[userGeolocation]) / 1000;

    if (!pieChart) {
      pieChart = new Chartist.Pie('.ct-chart', {labels, series}, {
        donut: true,
        donutWidth: 60,
        donutSolid: true,
        startAngle: 270,
        showLabel: true
      });
    } else {
      pieChart.update({labels, series});
    }

    let duration = localStorage.getItem('duration');
    duration = null === duration ? 0 : duration;

    document.getElementById('duration').textContent = duration.toString();
    document.getElementById('mbTotalValue').textContent = toMegaByte(stats.total);
    document.getElementById('kWhTotalValue').textContent = kWhTotal.toString();
    document.getElementById('kgCO2eValue').textContent = kgCO2e.toString();
    document.getElementById('chargedSmartphonesValue').textContent = chargedSmartphones.toString();
    document.getElementById('kmByCarValue').textContent = kmByCar.toString();
  }
}

start = () => {
  const sending = browser.runtime.sendMessage({ action: 'start' });
  sending.then(handleResponse, handleError);
  hide(startButton);
  show(stopButton);
  show(analysisInProgressMessage);
  localStorage.setItem('analysisStarted', '1');
}

stop = () => {
  const sending = browser.runtime.sendMessage({ action: 'stop' });
  sending.then(handleResponse, handleError);
  hide(stopButton);
  show(startButton);
  hide(analysisInProgressMessage);
  clearInterval(statsInterval);
  localStorage.removeItem('analysisStarted');
}

reset = () => {
  if (!confirm('Are you sure?')) {
    return;
  }

  localStorage.removeItem('stats');
  localStorage.removeItem('duration');
  hide(statsElement);
  showStats();
  hide(resetButton);
}

init = () => {
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
  statsInterval = setInterval(showStats, 2000);
}

translate = (target, translationKey) => {
  target.appendChild(document.createTextNode(browser.i18n.getMessage(translationKey)));
}

translateHref = (target, translationKey) => {
  target.href = browser.i18n.getMessage(translationKey);
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

document.querySelectorAll('[translate]').forEach(function(element) {
  translate(element, element.getAttribute('translate'));
});

document.querySelectorAll('[translate-href]').forEach(function(element) {
  translateHref(element, element.getAttribute('translate-href'));
});

init();
