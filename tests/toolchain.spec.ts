import {test,expect} from './fixtures';
test('actual companion compiles editor sketch and real AVR executes its artifact',async({page})=>{
 test.skip(!process.env.SIMULAB_TEST_TOKEN,'Requires an explicitly started real local companion');test.setTimeout(180000);
 await page.goto('/');await page.getByRole('tab',{name:'Code Editor',exact:true}).click();
 await page.getByLabel('Companion token').fill(process.env.SIMULAB_TEST_TOKEN!);
 await page.getByRole('button',{name:'Connect companion',exact:true}).click();
 await expect(page.getByRole('button',{name:'Build',exact:true})).toBeEnabled({timeout:10000});
 await page.getByRole('button',{name:'Build',exact:true}).click();
 await expect(page.getByLabel('Build output')).toContainText('Build passed',{timeout:150000});
 await page.getByRole('button',{name:'Load build',exact:true}).click();
 await expect(page.getByTestId('simulation-status')).toHaveText('ready',{timeout:10000});
 await page.getByRole('button',{name:'Run',exact:true}).click();
 await page.getByRole('tab',{name:'Serial Monitor',exact:true}).click();
 await expect(page.getByTestId('ide-serial-output')).toContainText('LED ON',{timeout:20000});
 await page.screenshot({path:'test-results/compiled-ide-serial.png'});
});
