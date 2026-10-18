/* Season & Sprout: client-side personal planner. Data stays in this browser; export regularly for backup. */
const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
const SLOTS=["Chilli","Salad","Soup","Bolognese-style","Pizza + simple side","Vegetarian patty","Curry","Ramen / noodle-style","Stir-fry for rice/noodles","Pasta dish 1","Tomato rice / risotto-style","Egg fried rice-style","Pasta dish 2","Daal","Bean/lentil stew or bake","Mexican-style"];
const KEY="seasonSproutDataV1";
const DATA_VERSION=2;
const clone=x=>JSON.parse(JSON.stringify(x));
let state={ingredients:clone(SEED_INGREDIENTS),recipes:[],plans:[],dataVersion:DATA_VERSION};
// Refresh seasonal facts from the bundled database while retaining each browser's personal edits.
try{
 const saved=localStorage.getItem(KEY);
 if(saved){
  const parsed=JSON.parse(saved);
  const savedByName=new Map((parsed.ingredients||[]).map(x=>[String(x.name||"").trim().toLowerCase(),x]));
  const refreshed=clone(SEED_INGREDIENTS).map(seed=>{
   const old=savedByName.get(seed.name.trim().toLowerCase());
   if(!old)return seed;
   return {...seed,
    preference:old.preference||seed.preference,
    notes:old.notes&&old.notes!=="Add recipe-use notes"?old.notes:seed.notes,
    excludeByDefault:(old.preference||seed.preference)==="Dislike",
    id:old.id
   };
  });
  // Keep user-added ingredients, but use the bundled database for known records.
  const known=new Set(refreshed.map(x=>x.name.trim().toLowerCase()));
  const custom=(parsed.ingredients||[]).filter(x=>!known.has(String(x.name||"").trim().toLowerCase()));
  state={...state,...parsed,ingredients:[...refreshed,...custom],recipes:parsed.recipes||[],plans:parsed.plans||[],dataVersion:DATA_VERSION};
 }
}catch(e){}
let editing={type:null,id:null};
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const id=()=>Math.random().toString(36).slice(2,10);
function save(){localStorage.setItem(KEY,JSON.stringify(state));}
function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200)}
function categories(){return [...new Set(state.ingredients.map(x=>x.category).filter(Boolean))].sort()}
function fillSelect(el,items,placeholder){el.innerHTML=`<option value="">${placeholder}</option>`+items.map(x=>`<option>${esc(x)}</option>`).join("")}
function init(){
  const m=$("#monthSelect");m.innerHTML=MONTHS.map((x,i)=>`<option value="${i}">${x}</option>`).join("");m.value=new Date().getMonth();
  ["#seasonCategory","#libraryCategory"].forEach(s=>fillSelect($(s),categories(),"All categories"));
  fillSelect($("#recipeSlotFilter"),SLOTS,"All recipe styles");
  $$(".tab").forEach(b=>b.addEventListener("click",()=>switchView(b.dataset.view)));
  ["#monthSelect","#seasonSearch","#seasonCategory","#seasonPreference","#hideDislikes"].forEach(s=>$(s).addEventListener("input",renderSeasonal));
  ["#librarySearch","#libraryCategory","#libraryPreference","#libraryType"].forEach(s=>$(s).addEventListener("input",renderIngredients));
  ["#recipeSearch","#recipeSlotFilter"].forEach(s=>$(s).addEventListener("input",renderRecipes));
  $("#addIngredientBtn").onclick=()=>openEditor("ingredient");
  $("#addRecipeBtn").onclick=()=>openEditor("recipe");
  $("#addPlanBtn").onclick=()=>openEditor("plan");
  $("#closeDialog").onclick=$("#cancelDialog").onclick=()=>$("#editDialog").close();
  $("#editForm").onsubmit=saveEditor;
  $("#deleteItemBtn").onclick=deleteItem;
  $("#exportBtn").onclick=exportData;
  $("#copyShoppingBtn").onclick=copyShopping;
  renderAll();
}
function switchView(v){$$(".tab").forEach(b=>b.classList.toggle("active",b.dataset.view===v));$$(".view").forEach(s=>s.classList.toggle("active",s.id==="view-"+v));}
function preferencePill(p){return `<span class="pill ${p==="Dislike"?"dislike":""}">${esc(p||"Not tried")}</span>`}
function monthNames(arr){
 const names=MONTHS.filter((_,i)=>Array.isArray(arr)&&Boolean(arr[i]));
 return names.length?names.join(", "):"Not recorded";
}
function renderSeasonal(){
 const month=Number($("#monthSelect").value),q=$("#seasonSearch").value.toLowerCase(),cat=$("#seasonCategory").value,pref=$("#seasonPreference").value,hide=$("#hideDislikes").checked;
 const items=state.ingredients.filter(x=>(!hide||x.preference!=="Dislike")&&(!q||x.name.toLowerCase().includes(q))&&(!cat||x.category===cat)&&(!pref||x.preference===pref));
 // Only use the explicit month arrays. Never fall back to the generic `months` array,
 // which can describe broad availability and previously caused almost every item to appear.
 const has=(x,key)=>Array.isArray(x[key])&&Boolean(x[key][month]);
 const outdoor=items.filter(x=>has(x,"ukOutdoorMonths"));
 const storage=items.filter(x=>has(x,"storageMonths")&&!has(x,"ukOutdoorMonths"));
 const protectedFresh=items.filter(x=>has(x,"protectedMonths")&&!has(x,"ukOutdoorMonths")&&!has(x,"storageMonths"));
 const uk=[...outdoor,...storage,...protectedFresh].sort((a,b)=>a.name.localeCompare(b.name));
 const imp=items.filter(x=>has(x,"importedMonths")&&!has(x,"ukOutdoorMonths")&&!has(x,"storageMonths")&&!has(x,"protectedMonths"));
 const preserve=items.filter(x=>!has(x,"ukOutdoorMonths")&&!has(x,"storageMonths")&&!has(x,"protectedMonths")&&!has(x,"importedMonths")&&(x.gapFiller||x.preservedOptions||x.preservedGapFillerNotes));
 const group=(title,arr,kind)=>`<section class="priority-group"><h3><i class="dot ${kind}"></i>${title}<span class="group-note">${arr.length}</span></h3>${arr.length?`<div class="ingredient-grid">${arr.map(x=>card(x,month)).join("")}</div>`:`<div class="empty-state">No matching produce recorded for ${MONTHS[month]}. Blank data means “not recorded”, not definitely unavailable.</div>`}</section>`;
 $("#seasonalGroups").innerHTML=group("1 · UK-grown / stored",uk,"uk")+group("2 · Seasonal imports",imp,"import")+group("3 · Preserved alternatives",preserve,"preserve");
}
function card(x,monthOverride=null){
 const month=monthOverride===null?Number($("#monthSelect")?.value)||0:monthOverride;
 const outdoor=Array.isArray(x.ukOutdoorMonths)&&x.ukOutdoorMonths[month];
 const storage=Array.isArray(x.storageMonths)&&x.storageMonths[month];
 const protectedFresh=Array.isArray(x.protectedMonths)&&x.protectedMonths[month];
 const imported=Array.isArray(x.importedMonths)&&x.importedMonths[month];
 const monthLabel=outdoor?"UK outdoor harvest":storage?"UK storage":protectedFresh?"UK protected-grown":imported?"Seasonal growing-region import":"Preserved option / season not recorded";
 const ukMonths=[...new Set([...(Array.isArray(x.ukOutdoorMonths)?x.ukOutdoorMonths.map((v,i)=>v?MONTHS[i].slice(0,3):null):[]),...(Array.isArray(x.storageMonths)?x.storageMonths.map((v,i)=>v?MONTHS[i].slice(0,3):null):[]),...(Array.isArray(x.protectedMonths)?x.protectedMonths.map((v,i)=>v?MONTHS[i].slice(0,3):null):[])].filter(Boolean))];
 const importMonths=Array.isArray(x.importedMonths)?x.importedMonths.map((v,i)=>v?MONTHS[i].slice(0,3):null).filter(Boolean):[];
 const monthRange=(arr)=>arr.length?arr.join(", "):"Not recorded";
 const shortNote=(x.seasonNotes||"").split(/(?:;|\. )/)[0].trim();
 const note=x.originBySeason||x.importOrigins||"";
 const prefs=x.preference&&x.preference!=="Untried"?preferencePill(x.preference):"";
 return `<article class="produce-card"><div class="card-top"><div><h4>${esc(x.name)}</h4><p class="category-label">${esc(x.category||"Produce")}</p></div>${prefs}</div><div class="card-detail"><strong>${esc(monthLabel)}</strong></div><p class="card-detail"><strong>UK months:</strong> ${esc(monthRange(ukMonths))}</p><p class="card-detail"><strong>Import season:</strong> ${esc(monthRange(importMonths))}</p>${shortNote?`<p class="card-detail">${esc(shortNote)}</p>`:""}${x.gapFiller?`<p class="card-detail"><span class="pill preserved">Preserved</span> ${esc(x.gapFiller)}</p>`:""}${x.sourceUrls?`<details class="card-detail"><summary>Sources & confidence</summary><p>${esc(note)}</p><p>${esc(x.verificationStatus||"Verification status not recorded")}</p><p>${esc(x.sourceUrls)}</p>${x.seasonalConfidence?`<p>Confidence: ${esc(x.seasonalConfidence)}</p>`:""}</details>`:""}<div class="card-actions"><button class="small-button" data-edit-ingredient="${esc(x.name)}">Edit</button></div></article>`;
}
function produceFamily(name){
 const n=name.toLowerCase();
 const families=[
  ["Mushrooms",/mushroom|shiitake|oyster|king oyster|enoki|shimeji|wood ear|porcini/],
  ["Broccoli",/broccoli/],
  ["Cauliflower & romanesco",/cauliflower|romanesco/],
  ["Cabbage",/cabbage|hispi|savoy|chinese leaf|napa cabbage/],
  ["Leafy greens",/spinach|rocket|watercress|kale|cavolo nero|chard|spring greens|mustard greens|sorrel|lettuce|lamb’s lettuce|lamb's lettuce/],
  ["Onions & shallots",/onion|shallot/],
  ["Garlic",/garlic/],
  ["Peppers & chillies",/pepper|chilli|jalapeño|jalapeno|habanero/],
  ["Tomatoes",/tomato/],
  ["Courgettes & marrow",/courgette|marrow/],
  ["Squash & pumpkin",/squash|pumpkin/],
  ["Beetroot",/beetroot/],
  ["Turnips & radishes",/turnip|radish|daikon|mooli/],
  ["Beans & peas",/peas|mangetout|sugar snap|green beans|runner beans|broad beans|edamame/],
  ["Melons",/melon|watermelon/],
  ["Citrus",/orange|clementine|satsuma|mandarin|lemon|lime|pomelo|grapefruit/],
  ["Berries",/strawberr|raspberr|blackberr|blueberr|blackcurrant|redcurrant|whitecurrant|gooseberr|elderberr|cranberr/],
  ["Plums & stone fruit",/plum|damson|greengage|peach|nectarine|apricot|cherr/],
  ["Pears",/pear/],
  ["Apples",/apple/]
 ];
 const found=families.find(([,re])=>re.test(n));return found?found[0]:name;
}
function groupedCards(items){
 const groups=new Map();items.forEach(x=>{const family=produceFamily(x.name);if(!groups.has(family))groups.set(family,[]);groups.get(family).push(x)});
 return [...groups.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([family,arr])=>{
  const isFamily=arr.length>1||arr.some(x=>produceFamily(x.name)!==x.name);
  if(!isFamily)return card(arr[0]);
  return `<details class="produce-family"><summary><span>${esc(family)}</span><span class="family-count">${arr.length} varieties</span></summary><div class="ingredient-grid family-items">${arr.sort((a,b)=>a.name.localeCompare(b.name)).map(card).join("")}</div></details>`;
 }).join("");
}
function renderIngredients(){
 const q=$("#librarySearch").value.toLowerCase(),cat=$("#libraryCategory").value,pref=$("#libraryPreference").value,type=$("#libraryType").value;
 const items=state.ingredients.filter(x=>(!q||x.name.toLowerCase().includes(q))&&(!cat||x.category===cat)&&(!pref||x.preference===pref)&&(!type||x.availabilityType===type));
 $("#ingredientGrid").innerHTML=items.length?groupedCards(items):`<div class="empty-state">No ingredients match those filters.</div>`;
}
function renderRecipes(){
 const q=$("#recipeSearch").value.toLowerCase(),slot=$("#recipeSlotFilter").value;
 const items=state.recipes.filter(x=>(!q||(x.name+" "+x.ingredients+" "+x.method).toLowerCase().includes(q))&&(!slot||x.slot===slot));
 $("#recipeGrid").innerHTML=items.length?items.map(x=>`<article class="recipe-card"><div class="card-top"><h3>${esc(x.name)}</h3><span class="pill">${esc(x.slot||"Recipe idea")}</span></div><p>${esc(x.season||"Season not set")} · ${esc(x.time||"Time not set")}</p><p class="recipe-ingredients"><b>Ingredients:</b> ${esc(x.ingredients||"Add ingredients")}</p><p>${esc(x.method||"Add method or notes")}</p><div class="card-actions"><button class="small-button" data-edit-recipe="${x.id}">Edit recipe</button></div></article>`).join(""):`<div class="empty-state">Your recipe workshop is ready. Add your first recipe idea whenever inspiration strikes.</div>`;
}
function renderPlanner(){
 const items=[...state.plans].sort((a,b)=>(a.date||"").localeCompare(b.date||""));
 $("#plannerList").innerHTML=items.length?items.map(x=>`<article class="plan-card"><div class="plan-date">${esc(x.date||"Date not set")}<br><span class="pill">${esc(x.meal||"Meal")}</span></div><div><h3>${esc(x.name||"Untitled meal")}</h3><p class="muted">${esc(x.ingredients||"No shopping ingredients entered")}</p></div><button class="small-button" data-edit-plan="${x.id}">Edit</button></article>`).join(""):`<div class="empty-state">No meals planned yet. Add a meal to start building your plan.</div>`;
 const list=items.flatMap(p=>(p.ingredients||"").split(/[,;\n]/).map(s=>s.trim()).filter(Boolean));
 $("#shoppingList").textContent=list.length?[...new Set(list)].map(x=>"□ "+x).join("\n"):"Your shopping list will appear here when planned meals have ingredients.";
}
function renderAll(){renderSeasonal();renderIngredients();renderRecipes();renderPlanner();}
function field(label,name,value="",type="text",full=false,options=null){let control=options?`<select name="${name}">${options.map(o=>`<option ${o===value?"selected":""}>${esc(o)}</option>`).join("")}</select>`:type==="textarea"?`<textarea name="${name}">${esc(value)}</textarea>`:`<input name="${name}" type="${type}" value="${esc(value)}">`;return `<label class="field ${full?"full":""}">${label}${control}</label>`}
function openEditor(type,item=null){
 editing={type,id:item?(item.id||item.name):null};$("#dialogFields").innerHTML="";$("#deleteItemBtn").classList.toggle("hidden",!item);let f="";
 if(type==="ingredient"){
  const x=item||{name:"",category:categories()[0]||"Other",preference:"Not tried",ukSeason:"",availabilityType:"Season needs checking",seasonNotes:"",preservedOptions:"",gapFiller:"",notes:"",excludeByDefault:false,months:Array(12).fill(false)};
  $("#dialogTitle").textContent=item?"Edit ingredient":"Add ingredient";
  f+=field("Ingredient name","name",x.name);f+=field("Category","category",x.category,"text",false);f+=field("Preference","preference",x.preference,"text",false,["Love","Like","Okay","Dislike","Not tried"]);f+=field("Availability type","availabilityType",x.availabilityType,"text",true,["UK-grown seasonal","Imported seasonal","Fresh year-round / storage / protected","Season needs checking"]);f+=field("Fresh UK season","ukSeason",x.ukSeason,"text",true);f+=field("Season notes","seasonNotes",x.seasonNotes,"textarea",true);f+=field("Preserved options","preservedOptions",x.preservedOptions,"text",true);f+=field("Suggested gap-filler","gapFiller",x.gapFiller,"text",true);f+=field("Your notes","notes",x.notes,"textarea",true);
  f+=`<div class="field full"><span>Fresh month markers</span><div class="filter-row">${MONTHS.map((m,i)=>`<label class="check-label"><input type="checkbox" name="month${i}" ${(x.ukOutdoorMonths||x.months)?.[i]?"checked":""}>${m.slice(0,3)}</label>`).join("")}</div></div>`;
 }else if(type==="recipe"){
  const x=item||{name:"",slot:SLOTS[0],season:"",time:"",ingredients:"",method:""};
  $("#dialogTitle").textContent=item?"Edit recipe":"New recipe";
  f+=field("Recipe name","name",x.name);f+=field("Recipe style","slot",x.slot,"text",false,SLOTS);f+=field("Season","season",x.season,"text",false,["Spring","Summer","Autumn","Winter","All year","Flexible"]);f+=field("Time / prep notes","time",x.time);f+=field("Ingredients (comma-separated)","ingredients",x.ingredients,"textarea",true);f+=field("Method / idea notes","method",x.method,"textarea",true);
 }else{
  const x=item||{date:"",meal:"Dinner",name:"",ingredients:""};
  $("#dialogTitle").textContent=item?"Edit planned meal":"Add meal";
  f+=field("Date","date",x.date,"date");f+=field("Meal","meal",x.meal,"text",false,["Breakfast","Lunch","Dinner","Side","Snack","Batch cook"]);f+=field("Meal / recipe name","name",x.name);f+=field("Ingredients to buy (comma-separated)","ingredients",x.ingredients,"textarea",true);
 }
 $("#dialogFields").innerHTML=f;$("#editDialog").showModal();
}
function currentItem(){return state[editing.type==="ingredient"?"ingredients":editing.type==="recipe"?"recipes":"plans"].find(x=>x.id===editing.id|| (editing.type==="ingredient"&&x.name===editing.id));}
function saveEditor(e){
 e.preventDefault();const form=new FormData($("#editForm")),data={};for(const [k,v] of form.entries())data[k]=v;
 if(editing.type==="ingredient"){
  const old=currentItem();const months=MONTHS.map((m,i)=>$("#dialogFields").querySelector(`[name="month${i}"]`).checked);
  const x={...(old||{}),...data,ukOutdoorMonths:months,months:months.map((v,i)=>Boolean(v||(old?.storageMonths||[])[i]||(old?.importedMonths||[])[i]||(old?.protectedMonths||[])[i])),excludeByDefault:data.preference==="Dislike",id:old?.id||id()};
  if(!x.name.trim()){toast("Please enter an ingredient name.");return}
  if(old)state.ingredients=state.ingredients.filter(y=>y!==old);state.ingredients.push(x);state.ingredients.sort((a,b)=>a.name.localeCompare(b.name));
  ["#seasonCategory","#libraryCategory"].forEach(s=>fillSelect($(s),categories(),"All categories"));
 }else{
  const arr=editing.type==="recipe"?state.recipes:state.plans,old=currentItem(),x={...(old||{}),...data,id:old?.id||id()};
  if(!x.name?.trim()){toast("Please enter a name.");return}
  if(old)arr.splice(arr.indexOf(old),1);arr.push(x);
 }
 save();$("#editDialog").close();renderAll();toast("Saved.");
}
function deleteItem(){const old=currentItem();if(!old)return;const arr=editing.type==="ingredient"?state.ingredients:editing.type==="recipe"?state.recipes:state.plans;const idx=arr.indexOf(old);if(idx>=0)arr.splice(idx,1);save();$("#editDialog").close();renderAll();toast("Deleted.");}
function exportData(){const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="season-and-sprout-backup.json";a.click();URL.revokeObjectURL(a.href);toast("Backup exported.");}
async function copyShopping(){const text=$("#shoppingList").textContent;try{await navigator.clipboard.writeText(text);toast("Shopping list copied.");}catch(e){toast("Copy isn't available in this browser.");}}
document.addEventListener("click",e=>{
 const ing=e.target.closest("[data-edit-ingredient]");if(ing){const item=state.ingredients.find(x=>x.name===ing.dataset.editIngredient);if(item)openEditor("ingredient",item);}
 const rec=e.target.closest("[data-edit-recipe]");if(rec){const item=state.recipes.find(x=>x.id===rec.dataset.editRecipe);if(item)openEditor("recipe",item);}
 const plan=e.target.closest("[data-edit-plan]");if(plan){const item=state.plans.find(x=>x.id===plan.dataset.editPlan);if(item)openEditor("plan",item);}
});
init();
