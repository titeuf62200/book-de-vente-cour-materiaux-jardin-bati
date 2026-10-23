/* Compléments autonomes pour le Book de vente Calais.
   Sommaires dynamiques, couleurs cohérentes et onglets imprimables sur chaque page.
   Ne modifie ni les références, ni les images, ni le stockage des produits. */
(function(){
  'use strict';
  if(typeof window.makePrintHTML!=='function') return;

  const originalPrint=window.makePrintHTML;
  const originalRender=window.render;
  const COLOR_KEY='book_vente_calais_couleurs_sous_rayons_v1';
  const PALETTE=[
    '#F2CF65','#EBA27B','#98CDB3','#8ABDD8','#C7A5D6','#EE9CB1',
    '#B8D77B','#77CFD0','#EABF93','#A8B9E6','#DBA6A8','#C8CF7D',
    '#80C4A6','#EABACB','#9FCEEA','#DBBD70','#B4A4E1','#84D2BF',
    '#EDAD73','#C9D5A0','#91B5B1','#D7A7C8','#ACC4F0','#F0C3A3',
    '#C2DF8E','#9EC9A3','#DBC69B','#96CFCE','#D0B0ED','#F2B5A5',
    '#AFD3DB','#CFD17E','#D9ABB1','#A9C49C','#D4C0E6','#E2C988'
  ];
  let rememberedColors={};

  try{
    const saved=JSON.parse(localStorage.getItem(COLOR_KEY)||'{}');
    if(saved&&typeof saved==='object'&&!Array.isArray(saved)){
      for(const [name,color] of Object.entries(saved)){
        if(typeof name==='string'&&PALETTE.includes(color)) rememberedColors[name]=color;
      }
    }
  }catch(e){ /* Mode privé : palette simplement en mémoire */ }

  function activeGroups(){
    const all=[];
    for(const item of products){
      if(item.archived||!item.sousRayon)continue;
      const name=String(item.sousRayon).trim();
      if(!all.includes(name))all.push(name);
    }
    return all;
  }
  function colorMap(){
    const groups=activeGroups();
    const taken=new Set(Object.values(rememberedColors));
    for(const group of groups){
      if(rememberedColors[group])continue;
      let color=PALETTE.find(x=>!taken.has(x));
      if(!color) color=PALETTE[groups.indexOf(group)%PALETTE.length];
      rememberedColors[group]=color;
      taken.add(color);
    }
    try{localStorage.setItem(COLOR_KEY,JSON.stringify(rememberedColors));}catch(e){}
    return rememberedColors;
  }

  const style=document.createElement('style');
  style.id='book-print-intercalaires-style';
  style.textContent=[
    '/* Codes couleur concordants entre le catalogue et les PDF. */',
    '.subcategory-header{transition:background-color .15s ease}',
    '@media print{',
    '.print-page:not(.p-cover){padding-right:18mm!important}',
    '.p-side-tab{position:absolute;top:0;bottom:0;right:0;width:8mm;',
    'background:var(--book-tab)!important;print-color-adjust:exact!important;',
    '-webkit-print-color-adjust:exact!important;display:flex;align-items:flex-start;justify-content:center;}',
    '.p-side-tab span{writing-mode:vertical-rl;font:700 7pt Arial,sans-serif;',
    'letter-spacing:.05em;color:#1f342d;padding-top:14mm;max-height:245mm;overflow:hidden}',
    '.p-category-label,.p-category-label.continued{background:var(--book-tab)!important;',
    'print-color-adjust:exact!important;-webkit-print-color-adjust:exact!important;',
    'border-left:2mm solid #304b3d!important;}',
    '.p-intro ul{margin-top:6mm!important;columns:1!important}',
    '.p-intro li.book-legend-item{padding:1.4mm 0!important;min-height:8mm!important;',
    'border-bottom:1px solid #d4ded7;break-inside:avoid;font-size:10.5pt!important;',
    'display:flex;justify-content:space-between;align-items:center;gap:4mm}',
    '.book-legend-name{background:var(--book-tab)!important;',
    'padding:1mm 3mm;display:inline-block;flex:1;border-radius:1mm;',
    'font-weight:700;color:#203b2d;print-color-adjust:exact!important;',
    '-webkit-print-color-adjust:exact!important}',
    '.book-legend-pages{white-space:nowrap;font-size:9.5pt;font-weight:800}',
    '.book-legend-note{font-size:10pt!important;color:#43614f;margin:5mm 0}',
    '.book-legend-heading{font-size:16pt;color:#164733;margin:7mm 0 0}',
    '.p-row{grid-template-columns:minmax(0,35fr) minmax(0,39fr) minmax(0,26fr)!important}',
    '.p-asset{min-width:0}',
    '}'
  ].join('\n');
  document.head.appendChild(style);

  function colorizeSite(){
    const colors=colorMap();
    document.querySelectorAll('#sidebarChapters .group-btn').forEach(btn=>{
      const name=btn.dataset.group;
      if(!name||!colors[name])return;
      btn.style.borderLeft='5px solid '+colors[name];
      btn.style.backgroundImage='linear-gradient(90deg,'+colors[name]+'55,transparent 80%)';
    });
    document.querySelectorAll('#catalogue .subcategory-header').forEach(header=>{
      const name=header.querySelector('h3')?.textContent.trim();
      if(!name||!colors[name])return;
      header.style.backgroundColor=colors[name];
      header.style.borderLeftColor='#426556';
    });
  }

  window.makePrintHTML=function(rayon){
    const html=originalPrint(rayon);
    const root=document.createElement('template');
    root.innerHTML=html;
    const sheets=Array.from(root.content.querySelectorAll('.print-page'));
    const colors=colorMap();
    const ranges=new Map();

    sheets.forEach((page,index)=>{
      const label=page.querySelector('.p-category-label');
      if(!label)return;
      const group=label.textContent.replace(/\s*\(suite\)\s*$/i,'').trim();
      if(!group)return;
      const pageNumber=index+1;
      if(!ranges.has(group))ranges.set(group,{start:pageNumber,end:pageNumber});
      else ranges.get(group).end=pageNumber;
      const tabColor=colors[group]||PALETTE[0];
      page.style.setProperty('--book-tab',tabColor);
      const tab=document.createElement('div');
      tab.className='p-side-tab';
      tab.setAttribute('aria-hidden','true');
      const name=document.createElement('span');
      name.textContent=group;
      tab.appendChild(name);
      page.appendChild(tab);
    });

    const contents=root.content.querySelector('.p-intro');
    if(contents){
      const title=document.createElement('h2');
      title.className='book-legend-heading';
      title.textContent='SOMMAIRE DES SOUS-RAYONS';
      const explanation=document.createElement('p');
      explanation.className='book-legend-note';
      explanation.textContent='Chaque couleur correspond au liseré vertical situé sur le bord droit des pages du même sous-rayon.';
      const list=contents.querySelector('ul');
      if(list){
        list.classList.add('book-legend');
        list.before(title,explanation);
        list.querySelectorAll('li').forEach(item=>{
          const group=item.textContent.trim();
          const range=ranges.get(group);
          const color=colors[group]||PALETTE[0];
          item.className='book-legend-item';
          item.style.setProperty('--book-tab',color);
          item.textContent='';
          const name=document.createElement('span');
          name.className='book-legend-name';
          name.textContent=group;
          const number=document.createElement('span');
          number.className='book-legend-pages';
          number.textContent=range?'p. '+range.start+(range.end>range.start?'–'+range.end:''):'—';
          item.append(name,number);
        });
      }
    }
    return root.innerHTML;
  };

  if(typeof originalRender==='function'){
    window.render=function(){
      const result=originalRender.apply(this,arguments);
      colorizeSite();
      return result;
    };
  }
  colorizeSite();
})();