import { Reflector } from '@nestjs/core';
import { RequirePermissions } from './require-permissions.decorator';
import { REQUIRE_PERMISSIONS_KEY } from '../constants/rbac.constants';

describe('RequirePermissions decorator', () => {
  it('registers required permission metadata', () => {
    const reflector = new Reflector();
    class TestController {
      @RequirePermissions('staff.view', 'staff.update')
      handler(): void {}
    }

    const permissions = reflector.get<string[]>(
      REQUIRE_PERMISSIONS_KEY,
      TestController.prototype.handler,
    );

    expect(permissions).toEqual(['staff.view', 'staff.update']);
  });
});
