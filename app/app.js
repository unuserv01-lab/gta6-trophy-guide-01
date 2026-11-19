// Leonida Trophy Guide: checklist tracker with saved progress, kind filters,
// a spoiler setting for story trophies, and a detail panel with a cited guide.
const EARNED_KEY = 'leonida-trophy-earned-v1';
const SPOILER_KEY = 'leonida-trophy-spoiler-v1';

const trophyList = document.getElementById('trophy-list');
const detailBody = document.getElementById('detail-body');
const progressCount = document.getElementById('progress-count');
const progressFill = document.getElementById('progress-fill');
const progressDetail = document.getElementById('progress-detail');
const searchInput = document.getElementById('search');
const gradeFilter = document.getElementById('grade-filter');
const earnedOnlyBox = document.getElementById('earned-only');
const spoilerToggle = document.getElementById('spoiler-toggle');
const controlsNote = document.getElementById('controls-note');
const emptyState = document.getElementById('empty-state');

let trophyData = [];
let earnedTrophies = new Set(loadEarnedTrophies());
let selectedTrophyId = 28;
let activeKind = 'all';

function loadEarnedTrophies() {
  try {
    return JSON.parse(localStorage.getItem(EARNED_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function saveEarnedTrophies() {
  localStorage.setItem(EARNED_KEY, JSON.stringify([...earnedTrophies]));
}

function isStoryTrophy(trophy) {
  return trophy.kind === 'story' || trophy.kind === 'platinum';
}

function isSpoilerHidden(trophy) {
  return spoilerToggle.checked && isStoryTrophy(trophy) && !earnedTrophies.has(trophy.name);
}

function filterTrophiesByKind(trophies, kind) {
  if (kind === 'all') return trophies;
  if (kind === 'story') return trophies.filter((t) => isStoryTrophy(t));
  if (kind === 'missable') return trophies.filter((t) => t.missable);
  if (kind === 'online') return [];
  return trophies.filter((t) => t.kind === kind);
}

function countEarnedByGrade(trophies) {
  const counts = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  for (const trophy of trophies) {
    if (earnedTrophies.has(trophy.name)) counts[trophy.grade] += 1;
  }
  return counts;
}

function updateProgressCard() {
  const total = trophyData.length;
  const earned = earnedTrophies.size;
  const byGrade = countEarnedByGrade(trophyData);
  progressCount.textContent = `${earned} of ${total} earned`;
  progressFill.style.width = total ? `${Math.round((earned / total) * 100)}%` : '0%';
  progressDetail.textContent = `${total ? Math.round((earned / total) * 100) : 0}% · Platinum: ${byGrade.platinum} of 1 · Gold: ${byGrade.gold} of 2 · Silver: ${byGrade.silver} of 6 · Bronze: ${byGrade.bronze} of 46`;
}

function renderTrophyList() {
  const query = searchInput.value.trim().toLowerCase();
  let visible = filterTrophiesByKind(trophyData, activeKind);
  if (gradeFilter.value !== 'all') visible = visible.filter((t) => t.grade === gradeFilter.value);
  if (earnedOnlyBox.checked) visible = visible.filter((t) => earnedTrophies.has(t.name));
  if (query) {
    visible = visible.filter((t) => `${t.name} ${t.description} ${t.guide}`.toLowerCase().includes(query));
  }
  trophyList.replaceChildren();
  for (const trophy of visible) {
    const item = document.createElement('li');
    item.className = 'trophy-card' + (earnedTrophies.has(trophy.name) ? ' is-earned' : '') + (trophy.id === selectedTrophyId ? ' is-selected' : '');
    item.id = `trophy-${trophy.id}`;
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = earnedTrophies.has(trophy.name);
    box.setAttribute('aria-label', `Mark ${trophy.name} as earned`);
    box.addEventListener('change', () => {
      if (box.checked) earnedTrophies.add(trophy.name);
      else earnedTrophies.delete(trophy.name);
      saveEarnedTrophies();
      updateProgressCard();
      renderTrophyList();
      renderTrophyDetail();
    });
    box.addEventListener('click', (event) => event.stopPropagation());
    const main = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'trophy-name';
    name.textContent = isSpoilerHidden(trophy) ? 'Hidden story trophy' : trophy.name;
    const description = document.createElement('div');
    description.className = 'trophy-description';
    description.textContent = isSpoilerHidden(trophy) ? 'Name and description hidden until earned.' : trophy.description;
    const meta = document.createElement('div');
    meta.className = 'trophy-meta';
    const gradeBadge = document.createElement('span');
    gradeBadge.className = `grade-badge grade-${trophy.grade}`;
    gradeBadge.textContent = trophy.grade;
    meta.append(gradeBadge);
    const kindTag = document.createElement('span');
    kindTag.className = 'kind-tag';
    kindTag.textContent = trophy.kind === 'side' ? 'side quests' : trophy.kind;
    meta.append(kindTag);
    if (trophy.missable) {
      const missableTag = document.createElement('span');
      missableTag.className = 'missable-tag';
      missableTag.textContent = '⚠ Potentially missable';
      meta.append(missableTag);
    }
    const preview = document.createElement('p');
    preview.className = 'trophy-guide-preview';
    preview.textContent = isSpoilerHidden(trophy) ? '' : trophy.guide;
    main.append(name, description, meta, preview);
    const selectButton = document.createElement('button');
    selectButton.type = 'button';
    selectButton.className = 'link-button';
    selectButton.textContent = 'Guide →';
    selectButton.addEventListener('click', (event) => {
      event.stopPropagation();
      selectTrophy(trophy.id);
    });
    item.append(box, main, selectButton);
    item.addEventListener('click', () => selectTrophy(trophy.id));
    trophyList.append(item);
  }
  emptyState.hidden = visible.length > 0;
  if (activeKind === 'online') {
    emptyState.hidden = false;
    emptyState.textContent = 'No online trophies — the game has 0 online trophies. Every one of the 55 trophies is single-player.';
  } else if (visible.length === 0) {
    emptyState.textContent = 'No trophies match this filter. Try clearing the search or choosing another kind.';
  }
  const kindLabel = activeKind === 'all' ? 'all 55 trophies' : `${visible.length} trophies in ${activeKind}`;
  controlsNote.textContent = `Showing ${kindLabel}. Spoiler mode hides the names and descriptions of story trophies until you earn them.`;
}

function renderTrophyDetail() {
  const trophy = trophyData.find((t) => t.id === selectedTrophyId) ?? trophyData[0];
  if (!trophy) return;
  detailBody.replaceChildren();
  const title = document.createElement('h3');
  title.id = 'detail-trophy-name';
  title.textContent = isSpoilerHidden(trophy) ? 'Hidden story trophy' : trophy.name;
  const grade = document.createElement('p');
  grade.className = 'detail-grade';
  grade.textContent = `${trophy.grade} trophy · ${trophy.kind === 'side' ? 'side quests' : trophy.kind}${trophy.missable ? ' · ⚠ Potentially missable' : ''}`;
  detailBody.append(title, grade);
  if (isSpoilerHidden(trophy)) {
    const hidden = document.createElement('p');
    hidden.textContent = 'This is a story trophy. Its name, description and guide stay hidden until you mark it earned.';
    detailBody.append(hidden);
    return;
  }
  const description = document.createElement('p');
  description.textContent = trophy.description;
  const guide = document.createElement('p');
  guide.className = 'detail-guide';
  guide.id = 'detail-guide-text';
  guide.textContent = trophy.guide;
  const source = document.createElement('p');
  source.className = 'detail-source';
  source.textContent = `Source: ${trophy.source} — `;
  const link = document.createElement('a');
  link.href = trophy.source_url;
  link.textContent = trophy.source_url;
  source.append(link);
  detailBody.append(description, guide, source);
  if (trophy.guide.startsWith('NOT YET CONFIRMED')) {
    const note = document.createElement('p');
    note.className = 'detail-unconfirmed';
    note.textContent = 'Honest gap: no reliable method was known at release, so this guide does not invent one.';
    detailBody.append(note);
  }
}

function selectTrophy(id) {
  selectedTrophyId = id;
  renderTrophyList();
  renderTrophyDetail();
  document.getElementById(`trophy-${id}`)?.scrollIntoView({ block: 'nearest' });
}

function exportProgress() {
  const blob = new Blob([JSON.stringify([...earnedTrophies], null, 2)], { type: 'application/json' });
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(blob);
  anchor.download = 'leonida-trophy-progress.json';
  anchor.click();
  URL.revokeObjectURL(anchor.href);
}

async function importProgressFile(file) {
  if (!file) return;
  const names = JSON.parse(await file.text());
  earnedTrophies = new Set(names.filter((name) => trophyData.some((t) => t.name === name)));
  saveEarnedTrophies();
  updateProgressCard();
  renderTrophyList();
  renderTrophyDetail();
}

function resetProgress() {
  earnedTrophies = new Set();
  saveEarnedTrophies();
  updateProgressCard();
  renderTrophyList();
  renderTrophyDetail();
}

async function loadTrophyData() {
  const response = await fetch('data/trophies.json');
  const documentData = await response.json();
  return documentData.trophies;
}

function readDeepLink() {
  const hash = new URLSearchParams(location.hash.slice(1));
  const trophyId = Number(hash.get('trophy'));
  if (trophyId >= 1 && trophyId <= 55) selectedTrophyId = trophyId;
  const kind = hash.get('kind');
  if (kind && ['all', 'story', 'side', 'missable', 'collectibles', 'activities', 'online'].includes(kind)) activeKind = kind;
  if (hash.get('spoiler') === 'on') spoilerToggle.checked = true;
}

function applyDeepLink() {
  readDeepLink();
  document.querySelectorAll('#kind-filters .kind-button').forEach((b) => b.classList.toggle('is-active', b.dataset.kind === activeKind));
  renderTrophyList();
  renderTrophyDetail();
}

trophyData = await loadTrophyData();
spoilerToggle.checked = localStorage.getItem(SPOILER_KEY) === 'on';
readDeepLink();

document.querySelectorAll('#kind-filters .kind-button').forEach((button) => {
  button.addEventListener('click', () => {
    activeKind = button.dataset.kind;
    document.querySelectorAll('#kind-filters .kind-button').forEach((b) => b.classList.toggle('is-active', b === button));
    renderTrophyList();
  });
  button.classList.toggle('is-active', button.dataset.kind === activeKind);
});
searchInput.addEventListener('input', renderTrophyList);
gradeFilter.addEventListener('change', renderTrophyList);
earnedOnlyBox.addEventListener('change', renderTrophyList);
spoilerToggle.addEventListener('change', () => {
  localStorage.setItem(SPOILER_KEY, spoilerToggle.checked ? 'on' : 'off');
  renderTrophyList();
  renderTrophyDetail();
});
document.getElementById('export-progress').addEventListener('click', exportProgress);
document.getElementById('import-progress').addEventListener('change', (event) => importProgressFile(event.target.files[0]));
document.getElementById('reset-progress').addEventListener('click', resetProgress);
document.getElementById('missable-jump').addEventListener('click', () => {
  activeKind = 'missable';
  document.querySelectorAll('#kind-filters .kind-button').forEach((b) => b.classList.toggle('is-active', b.dataset.kind === 'missable'));
  selectTrophy(28);
  document.getElementById('trophy-detail').scrollIntoView({ behavior: 'smooth' });
});

updateProgressCard();
renderTrophyList();
renderTrophyDetail();
window.addEventListener('hashchange', applyDeepLink);
