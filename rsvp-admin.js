/* LOVIRA | RSVP display for the authenticated admin dashboard only. */
(() => {
  "use strict";
  function start() {
    const dashboard = document.getElementById("lovira-dashboard");
    if (!dashboard || document.getElementById("lovira-rsvp-admin")) return;
    const section = document.createElement("section");
    section.id = "lovira-rsvp-admin";
    section.dir = "rtl";
    section.innerHTML = `
      <style>
        #lovira-rsvp-admin {margin:22px 0;padding:20px;border:1px solid #ad8c5d;border-radius:14px;color:inherit}
        #lovira-rsvp-admin .lrsvp-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px}
        #lovira-rsvp-admin .lrsvp-head h3{margin:0 0 8px;color:#daba7f}
        #lovira-rsvp-admin button,#lovira-rsvp-admin select{border-radius:8px;padding:10px 14px;border:1px solid #a98b5d;background:#33283b;color:#fff8ed;font:inherit;cursor:pointer}
        #lovira-rsvp-admin .lrsvp-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin:18px 0}
        #lovira-rsvp-admin .lrsvp-stat{padding:14px;border:1px solid #9d835655;border-radius:10px;text-align:center}
        #lovira-rsvp-admin .lrsvp-stat strong{display:block;font-size:24px;color:#e9cb8f}
        #lovira-rsvp-admin .lrsvp-stat span{font-size:13px}
        #lovira-rsvp-admin .lrsvp-table{overflow-x:auto}
        #lovira-rsvp-admin table{width:100%;border-collapse:collapse;min-width:600px;text-align:right}
        #lovira-rsvp-admin th,#lovira-rsvp-admin td{padding:11px 9px;border-bottom:1px solid #a98b5d55;font-size:14px}
        #lovira-rsvp-admin .lrsvp-msg{margin:12px 0;color:inherit}
      </style>
      <div class="lrsvp-head">
        <div><h3>💌 تأكيدات الحضور</h3><small>مستقلة عن تسجيل الدخول بالباركود</small></div>
        <div>
          <select id="lrsvp-admin-filter" aria-label="تصفية حسب التأكيد">
            <option value="all">جميع الحالات</option>
            <option value="attending">أكدت الحضور</option>
            <option value="declined">اعتذرت</option>
            <option value="pending">لم ترد</option>
          </select>
          <button type="button" id="lrsvp-admin-refresh">تحديث</button>
        </div>
      </div>
      <div class="lrsvp-stats" aria-live="polite">
        <div class="lrsvp-stat"><strong id="lrsvp-admin-yes">—</strong><span>أكدن الحضور</span></div>
        <div class="lrsvp-stat"><strong id="lrsvp-admin-no">—</strong><span>اعتذرن</span></div>
        <div class="lrsvp-stat"><strong id="lrsvp-admin-pending">—</strong><span>لم يرددن</span></div>
        <div class="lrsvp-stat"><strong id="lrsvp-admin-companions">—</strong><span>مرافقات المؤكدات</span></div>
      </div>
      <p class="lrsvp-msg" id="lrsvp-admin-message" role="status">اختاري المناسبة من قائمة إضافة الضيفات، ثم اضغطي تحديث.</p>
      <div class="lrsvp-table"><table>
        <thead><tr><th>اسم الضيفة</th><th>المرافقات</th><th>الجهة</th><th>الرد</th><th>وقت الرد</th></tr></thead>
        <tbody id="lrsvp-admin-rows"></tbody>
      </table></div>`;
    dashboard.appendChild(section);

    const $ = id => document.getElementById(id);
    const message = $("lrsvp-admin-message");
    const rows = $("lrsvp-admin-rows");
    const filter = $("lrsvp-admin-filter");
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
      $("lrsvp-admin-yes").textContent = yes.length;
      $("lrsvp-admin-no").textContent = no.length;
      $("lrsvp-admin-pending").textContent = pending.length;
      $("lrsvp-admin-companions").textContent = yes.reduce((sum, g) => sum + (Number(g.companions) || 0), 0);
      const selected = filter.value;
      const data = selected === "all" ? guests : guests.filter(g => selected === "pending"
        ? !["attending", "declined"].includes(g.rsvp_status) : g.rsvp_status === selected);
      rows.replaceChildren();
      for (const g of data) {
        const tr = document.createElement("tr");
        const values = [g.guest_name || "—", String(g.companions ?? 0),
          g.guest_side === "groom" ? "أم المعرس" : g.guest_side === "bride" ? "أم العروس" : "غير محددة",
          status(g.rsvp_status), date(g.rsvp_at)];
        for (const value of values) {
          const cell = document.createElement("td");
          cell.textContent = value;
          tr.appendChild(cell);
        }
        rows.appendChild(tr);
      }
      if (!data.length) message.textContent = guests.length ? "لا توجد ضيفات ضمن هذه الحالة." : "لا توجد ضيفات لهذه المناسبة.";
      else message.textContent = `عدد النتائج المعروضة: ${data.length} من ${guests.length} دعوة.`;
    }
    let currentRequest = 0;
    async function refresh() {
      const request = ++currentRequest;
      const eventId = $("guest-event")?.value;
      if (!eventId) {
        guests = [];
        rows.replaceChildren();
        for (const id of ["lrsvp-admin-yes", "lrsvp-admin-no", "lrsvp-admin-pending", "lrsvp-admin-companions"]) $(id).textContent = "—";
        message.textContent = "اختاري المناسبة أولًا من قائمة إضافة الضيفات بالأعلى.";
        return;
      }
      if (typeof loviraClient === "undefined" || !loviraClient ||
          typeof authorizedAdminId === "undefined" || !authorizedAdminId) {
        message.textContent = "سجّلي الدخول إلى لوحة الإدارة أولًا.";
        return;
      }
      message.textContent = "جاري تحميل تأكيدات الحضور...";
      try {
        const {data, error} = await loviraClient.from("lovira_guests")
          .select("guest_name, companions, guest_side, rsvp_status, rsvp_at")
          .eq("event_id", eventId)
          .order("guest_name", {ascending: true});
        if (request !== currentRequest) return;
        if (error) throw error;
        guests = data || [];
        render();
      } catch (err) {
        if (request !== currentRequest) return;
        message.textContent = "تعذر تحميل التأكيدات: " + (err?.message || "حدث خطأ");
      }
    }
    $("lrsvp-admin-refresh").addEventListener("click", refresh);
    filter.addEventListener("change", render);
    $("guest-event")?.addEventListener("change", refresh);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && !dashboard.hidden && $("guest-event")?.value) refresh();
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, {once:true});
  else start();
})();
