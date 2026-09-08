import { createRouter, createWebHashHistory } from "vue-router";
import GameLayout from "../ui/layouts/GameLayout.vue";

const OverviewPage = () => import("../ui/pages/OverviewPage.vue");
const RecruitmentPage = () => import("../ui/pages/RecruitmentPage.vue");
const MembersPage = () => import("../ui/pages/MembersPage.vue");
const MemberDetailPage = () => import("../ui/pages/MemberDetailPage.vue");
const DungeonsPage = () => import("../ui/pages/DungeonsPage.vue");
const ActivitiesPage = () => import("../ui/pages/ActivitiesPage.vue");
const LootPage = () => import("../ui/pages/LootPage.vue");
const CombatReportPage = () => import("../ui/pages/CombatReportPage.vue");

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: "/",
      component: GameLayout,
      redirect: "/overview",
      children: [
        { path: "overview", name: "overview", component: OverviewPage },
        { path: "recruitment", name: "recruitment", component: RecruitmentPage },
        { path: "members", name: "members", component: MembersPage },
        { path: "members/:memberId", name: "member-detail", component: MemberDetailPage },
        { path: "dungeons", name: "dungeons", component: DungeonsPage },
        { path: "activities", name: "activities", component: ActivitiesPage },
        { path: "loot", name: "loot", component: LootPage },
        { path: "reports", name: "reports", component: CombatReportPage },
        { path: "reports/:reportId", name: "combat-report", component: CombatReportPage },
      ],
    },
    { path: "/:pathMatch(.*)*", redirect: "/overview" },
  ],
});
