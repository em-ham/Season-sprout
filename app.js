/* Season & Sprout: client-side personal planner. Data stays in this browser; export regularly for backup. */
const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
const SLOTS=["Chilli","Salad","Soup","Bolognese-style","Pizza + simple side","Vegetarian patty","Curry","Ramen / noodle-style","Stir-fry for rice/noodles","Pasta dish 1","Tomato rice / risotto-style","Egg fried rice-style","Pasta dish 2","Daal","Bean/lentil stew or bake","Mexican-style"];
const KEY="seasonSproutDataV1";
const clone=x=>JSON.parse(JSON.stringify(x));
let state={ingredients:clone(SEED_INGREDIENTS),recipes:[],plans:[]};
try{const saved=localStorage.getItem(KEY);if(saved){const parsed=JSON.parse(saved);state={...state,...parsed};}}catch(e){}
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
function renderSeasonal(){
 const month=Number($("#monthSelect").value),q=$("#seasonSearch").value.toLowerCase(),cat=$("#seasonCategory").value,pref=$("#seasonPreference").value,hide=$("#hideDislikes").checked;
 const items=state.ingredients.filter(x=>(!hide||x.preference!=="Dislike")&&(!q||x.name.toLowerCase().includes(q))&&(!cat||x.category===cat)&&(!pref||x.preference===pref));
 const uk=items.filter(x=>x.months?.[month]&&x.availabilityType==="UK-grown seasonal");
 const imp=items.filter(x=>x.months?.[month]&&x.availabilityType==="Imported seasonal");
 const fresh=items.filter(x=>x.months?.[month]&&!["UK-grown seasonal","Imported seasonal"].includes(x.availabilityType));
 const preserved=items.filter(x=>!x.months?.[month]&&x.gapFiller);
 const group=(title,note,arr,kind)=>`<section class="priority-group"><h3><i class="dot ${kind}"></i>${title}<span class="group-note">${arr.length} ingredients</span></h3>${arr.length?`<div class="ingredient-grid">${arr.map(card).join("")}</div>`:`<div class="empty-state">No matching ingredients in this group with the current filters.</div>`}</section>`;
 $("#seasonalGroups").innerHTML=group("1 · Fresh UK seasonal","First choice",uk,"uk")+group("2 · Fresh, in global season","Seasonal imports",imp,"import")+group("Fresh year-round / storage","Available outside a narrow season",fresh,"uk")+group("3 · Preserved gap-fillers","Useful when fresh options aren't in season",preserved,"preserve");
}
function card(x){return `<article class="produce-card"><div class="card-top"><div><h4>${esc(x.name)}</h4><p class="category-label">${esc(x.category)}</p></div>${preferencePill(x.preference)}</div><div class="card-detail">${x.months?.[Number($("#monthSelect")?.value)||0]?"Fresh month marked":"Fresh month not marked"} · ${esc(x.availabilityType)}</div>${x.seasonNotes?`<p class="card-detail">${esc(x.seasonNotes)}</p>`:""}${x.gapFiller?`<p class="card-detail"><span class="pill preserved">Gap filler</span> ${esc(x.gapFiller)}</p>`:""}<div class="card-actions"><button class="small-button" data-edit-ingredient="${esc(x.name)}">Edit details</button></div></article>`}
function renderIngredients(){
 const q=$("#librarySearch").value.toLowerCase(),cat=$("#libraryCategory").value,pref=$("#libraryPreference").value,type=$("#libraryType").value;
 const items=state.ingredients.filter(x=>(!q||x.name.toLowerCase().includes(q))&&(!cat||x.category===cat)&&(!pref||x.preference===pref)&&(!type||x.availabilityType===type));
 $("#ingredientGrid").innerHTML=items.length?items.map(card).join(""):`<div class="empty-state">No ingredients match those filters.</div>`;
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
  f+=`<div class="field full"><span>Fresh month markers</span><div class="filter-row">${MONTHS.map((m,i)=>`<label class="check-label"><input type="checkbox" name="month${i}" ${x.months?.[i]?"checked":""}>${m.slice(0,3)}</label>`).join("")}</div></div>`;
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
  const x={...(old||{}),...data,months,excludeByDefault:data.preference==="Dislike",id:old?.id||id()};
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
