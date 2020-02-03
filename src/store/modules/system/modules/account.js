import { Message, MessageBox, Loading } from 'element-ui'
import util from '@/libs/util.js'
import { loginByUsername, loginByMobile } from '@/api/login'
import { GetMenu } from '@/api/menu'
import i18n from '@/i18n'

export default {
  namespaced: true,
  actions: {
    /**
     * 手机号登录
     */
    loginByPhone ({ commit, dispatch }, { vm, mobile, code }) {
      // 开始请求登录接口
      const loading = Loading.service()
      loginByMobile(mobile, code)
        .then(res => {
          // 设置 cookie 一定要存 uuid 和 token 两个 cookie
          // 整个系统依赖这两个数据进行校验和存储
          // uuid 是用户身份唯一标识 用户注册的时候确定 并且不可改变 不可重复
          // token 代表用户当前登录状态 建议在网络请求中携带 token
          // 如有必要 token 需要定时更新，默认保存一天
          util.cookies.set('uuid', res.data['x-user-name'])
          util.cookies.set('token', res.data.access_token)
          // 设置 vuex token信息
          commit('sysStore/user/SET_ACCESS_TOKEN', res.data.access_token, { root: true })
          commit('sysStore/user/SET_REFRESH_TOKEN', res.data.refresh_token, { root: true })
          commit('sysStore/user/SET_USER_INFO', { name: res.data['x-user-name'] }, { root: true })
          commit('sysStore/user/SET_ROLES', res.data['x-user-role'], { root: true })
          commit('sysStore/user/SET_PERMISSIONS', res.data['x-user-permission'], { root: true })
          // 用户登陆后从持久化数据加载一系列的设置
          dispatch('load')
          GetMenu().then(res => {
            // 设置用户菜单
            commit('sysStore/user/SET_MENU', res.data, { root: true })
            // 设置顶栏菜单
            commit('sysStore/menu/headerSet', res.data, { root: true })
            // 初始化菜单搜索功能
            commit('sysStore/search/init', util.initHeaderMenu(res.data), { root: true })
            // 重定向对象不存在则返回顶层路径
            vm.$router.replace(vm.$route.query.redirect || '/')
          })
        })
        .finally(() => {
          loading.close()
        })
        .catch(err => {
          console.group('登陆出错')
          console.log('err: ', err)
          console.groupEnd()
        })
    },
    /**
     * @description 登录
     * @param {Object} param context
     * @param {Object} param username {String} 用户账号
     * @param {Object} param password {String} 密码
     * @param {Object} param route {Object} 登录成功后定向的路由对象 任何 vue-router 支持的格式
     */
    login ({ commit, dispatch }, { vm, tenantId, username, password, code, randomStr }) {
      // 开始请求登录接口
      const loading = Loading.service()
      loginByUsername(tenantId, username, password, code, randomStr)
        .then(res => {
          // 设置 cookie 一定要存 uuid 和 token 两个 cookie
          // 整个系统依赖这两个数据进行校验和存储
          // uuid 是用户身份唯一标识 用户注册的时候确定 并且不可改变 不可重复
          // token 代表用户当前登录状态 建议在网络请求中携带 token
          // 如有必要 token 需要定时更新，默认保存一天
          util.cookies.set('uuid', res.data['x-user-name'])
          util.cookies.set('tid', res.data['x-tenant-id'])
          util.cookies.set('token', res.data.access_token)
          // 设置 vuex token信息
          commit('sysStore/user/SET_ACCESS_TOKEN', res.data.access_token, { root: true })
          commit('sysStore/user/SET_REFRESH_TOKEN', res.data.refresh_token, { root: true })
          commit('sysStore/user/SET_USER_INFO', { name: res.data['x-user-name'] }, { root: true })
          commit('sysStore/user/SET_ROLES', res.data['x-user-role'], { root: true })
          commit('sysStore/user/SET_PERMISSIONS', res.data['x-user-permission'], { root: true })
          // 用户登陆后从持久化数据加载一系列的设置
          dispatch('load')
          GetMenu().then(res => {
            // 设置用户菜单
            commit('sysStore/user/SET_MENU', res.data, { root: true })
            // 设置顶栏菜单
            commit('sysStore/menu/headerSet', res.data, { root: true })
            // 初始化菜单搜索功能
            commit('sysStore/search/init', util.initHeaderMenu(res.data), { root: true })
            // 重定向对象不存在则返回顶层路径
            vm.$router.replace(vm.$route.query.redirect || '/')
          })
        })
        .finally(() => {
          loading.close()
        })
        .catch(err => {
          console.group('登陆出错')
          console.log('err: ', err)
          console.groupEnd()
        })
    },
    /**
     * @description 注销用户并返回登录页面
     * @param {Object} param context
     * @param {Object} param confirm {Boolean} 是否需要确认
     */
    logout ({ commit, dispatch }, { vm, confirm = false } = {}) {
      /**
       * @description 注销
       */
      function doLogout () {
        // 删除cookie
        util.cookies.remove('token')
        util.cookies.remove('tid')
        util.cookies.remove('uuid')
        // 跳转路由
        vm.$router.push({
          name: 'login'
        })
      }
      // 判断是否需要确认
      if (confirm) {
        commit('sysStore/gray/set', true, { root: true })
        MessageBox.confirm(i18n.t('public.confirm.special.logout.message'), i18n.t('public.confirm.special.logout.title'), {
          confirmButtonText: i18n.t('public.confirm.special.logout.button.confirm'),
          cancelButtonText: i18n.t('public.confirm.special.logout.button.cancel'),
          type: 'warning'
        })
          .then(() => {
            commit('sysStore/gray/set', false, { root: true })
            doLogout()
          })
          .catch(() => {
            commit('sysStore/gray/set', false, { root: true })
            Message({
              message: i18n.t('public.message.special.logout.cancel')
            })
          })
      } else {
        doLogout()
      }
    },
    /**
     * @description 用户登录后从持久化数据加载一系列的设置
     * @param {Object} state vuex state
     */
    load ({ dispatch }) {
      return new Promise(async resolve => {
        // DB -> store 加载用户名
        await dispatch('sysStore/user/load', null, { root: true })
        // DB -> store 加载用户菜单
        await dispatch('sysStore/menu/load', null, { root: true })
        // DB -> store 加载主题
        await dispatch('sysStore/theme/load', null, { root: true })
        // DB -> store 加载页面过渡效果设置
        await dispatch('sysStore/transition/load', null, { root: true })
        // DB -> store 持久化数据加载上次退出时的多页列表
        await dispatch('sysStore/page/openedLoad', null, { root: true })
        // DB -> store 持久化数据加载侧边栏折叠状态
        await dispatch('sysStore/menu/asideCollapseLoad', null, { root: true })
        // DB -> store 持久化数据加载全局尺寸
        await dispatch('sysStore/size/load', null, { root: true })
        // end
        resolve()
      })
    }
  }
}
