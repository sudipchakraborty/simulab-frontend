import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests',use:{baseURL:'http://127.0.0.1:5175',viewport:{width:1440,height:1000}},webServer:{command:'npm.cmd run preview -- --port 5175 --strictPort',url:'http://127.0.0.1:5175',reuseExistingServer:false},reporter:'list'});
