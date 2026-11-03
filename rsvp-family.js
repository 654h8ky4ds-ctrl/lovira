/* LOVIRA | Read-only RSVP summary for groom's mother. Requires valid ?token=UUID. */
(() => {
  "use strict";
  function start() {
    if (document.getElementById("lovira-rsvp-family")) return;
    const target = document.querySelector("main") || document.body;
    const section = document.createElement("section");
    section.id = "lovira-rsvp-family";
    section.dir = "rtl";
    section.innerHTML = `
      <style>
        #lovira-rsvp-family{margin:24px auto;padding:20px;max-width:900px;border:1px solid #dfcfb9;border-radius:16px;background:#fff;color:#493c38}
        #lovira-rsvp-family h2{color:#8c6e47;margin:0 0 10px}
        #lovira-rsvp-family .lrsvp-top{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px}
        #lovira-rsvp-family button,#lovira-rsvp-family select{padding:10px;border-radius:9px;border:1px solid #c9af8a;background:#f7f1e8;color:#493c38;font:inherit;cursor:pointer}
        #lovira-rsvp-family .lrsvp-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(112px,1fr));gap:8px;margin:16px 0}
        #lovira-rsvp-family .lrsvp-stat{border:1px solid #e6d8c3;border-radius:9px;padding:12px;text-align:center}
        #lovira-rsvp-family .lrsvp-stat strong{display:block;font-size:22px;color:#947246}
        #lovira-rsvp-family .lrsvp-stat span{font-size:13px}
        #lovira-rsvp-family .lrsvp-table{overflow-x:auto}
        #lovira-rsvp-family table{border-collapse:collapse;min-width:470px;width:100%;text-align:right}
        #lovira-rsvp-family th,#lovira-rsvp-family td{padding:11px 8px;border-bottom:1px solid #eee3d4;font-size:14px}
      </style>
      <div class="lrsvp-top">
        <div><h2>💌 تأكيدات الحضور</h2><small>دعوة عايش · عرض فقط</small></div>
        <div>
          <select id="lrsvp-family-filter" aria-label="تصفية التأكيدات">
            <option value="all">جميع الحالات</option>
            <option value="attending">أكدت الحضور</option>
            <option value="declined">اعتذرت</option>
            <option value="pending">لم ترد</option>
          </select>
          <button type="button" id="lrsvp-family-refresh">تحديث</button>
        </div>
      </div>
      <div class="lrsvp-stats" aria-live="polite">
        <div class="lrsvp-stat"><strong id="lrsvp-family-yes">—</strong><span>أكدن الحضور</span></div>
        <div class="lrsvp-stat"><strong id="lrsvp-family-no">—</strong><span>اعتذرن</span></div>
        <div class="lrsvp-stat"><strong id="lrsvp-family-pending">—</strong><span>لم يرددن</span></div>
        <div class="lrsvp-stat"><strong id="lrsvp-family-companions">—</strong><span>مرافقات المؤكدات</span></div>
      </div>
      <p id="lrsvp-family-message" role="status">جاري التحقق من صلاحية الرابط...</p>
      <div class="lrsvp-table"><table>
        <thead><tr><th>اسم الضيفة</th><th>المرافقات</th><th>الرد</th><th>وقت الرد</th></tr></thead>
        <tbody id="lrsvp-family-rows"></tbody>
      </table></div>`;
    target.appendChild(section);
    const $ = id => document.getElementById(id);
    const msg = $("lrsvp-family-message");
    const rows = $("lrsvp-family-rows");
    const filter = $("lrsvp-family-filter");
    const token = new URLSearchParams(location.search).get("token");
    let guests = [];
    const status = s => s === "attending" ? "✅ سأحضر" : s === "declined" ? "❌ لن أحضر" : "⏳ لم ترد";
    const date = s => {
      if (!s) return "—";
      const d = new Date(s);
      return Number.isNaN(d.valueOf()) ? "—" : new Intl.DateTimeFormat("ar-SA", {
        timeZone: "Asia/Riyadh", dateStyle: "medium", timeStyle: "short"
      }).format(d);
    };
    function render() {
      const yes = guests.filter(g => g.rsvp_status === "attending");
      const no = guests.filter(g => g.rsvp_status === "declined");
      const pending = guests.filter(g => !["attending", "declined"].includes(g.rsvp_status));
      $("lrsvp-family-yes").textContent = yes.length;
      $("lrsvp-family-no").textContent = no.length;
      $("lrsvp-family-pending").textContent = pending.length;
      $("lrsvp-family-companions").textContent = yes.reduce((sum, g) => sum + (Number(g.companions) || 0), 0);
      const selected = filter.value;
      const data = selected === "all" ? guests : guests.filter(g => selected === "pending"
        ? !["attending", "declined"].includes(g.rsvp_status) : g.rsvp_status === selected);
      rows.replaceChildren();
      for (const g of data) {
        const tr = document.createElement("tr");
        for (const value of [g.guest_name || "—", String(g.companions ?? 0), status(g.rsvp_status), date(g.rsvp_at)]) {
          const cell = document.createElement("td");
          cell.textContent = value;
          tr.appendChild(cell);
        }
        rows.appendChild(tr);
      }
      msg.textContent = data.length ? `عدد النتائج: ${data.length} من ${guests.length} دعوة.` :
        guests.length ? "لا توجد ضيفات بهذه الحالة." : "لا توجد ضيفات مرتبطة بهذا الرابط.";
    }
    async function refresh() {
      if (!token || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token)) {
        msg.textContent = "الرابط غير صالح.";
        return;
      }
      if (typeof db === "undefined" || !db) {
        msg.textContent = "تعذر الاتصال بالنظام.";
        return;
      }
      msg.textContent = "جاري تحديث تأكيدات الحضور...";
      try {
        const {data, error} = await db.rpc("lovira_family_rsvp", {p_token:token});
        if (error) throw error;
        if (data?.status !== "success") throw new Error(data?.message || "غير مصرح بالعرض");
        guests = Array.isArray(data.guests) ? data.guests : [];
        render();
      } catch (err) {
        guests = [];
        rows.replaceChildren();
        msg.textContent = "تعذر تحميل التأكيدات: " + (err?.message || "حدث خطأ");
      }
    }
    $("lrsvp-family-refresh").addEventListener("click", refresh);
    filter.addEventListener("change", render);
    document.addEventListener("visibilitychange", () => {if (!document.hidden) refresh();});
    refresh();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, {once:true});
  else start();
})();
