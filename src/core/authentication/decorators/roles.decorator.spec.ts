import 'reflect-metadata';
import { UserRoleValues } from 'src/core/user/entities/user.entity';
import { ROLES_KEY, Roles } from './roles.decorator';

class TestClass {
  @Roles(UserRoleValues.ADMINISTRATOR, UserRoleValues.USER)
  testMethod() {
    return true;
  }
}

describe('Roles Decorator', () => {
  it('should set roles metadata on method', () => {
    const methodDescriptor = Object.getOwnPropertyDescriptor(
      TestClass.prototype,
      'testMethod',
    );

    expect(methodDescriptor?.value).toBeDefined();
    if (!methodDescriptor?.value) {
      throw new Error('testMethod descriptor was not found');
    }

    const metadata = Reflect.getMetadata(
      ROLES_KEY,
      methodDescriptor.value as object,
    ) as string[] | undefined;

    expect(metadata).toEqual([
      UserRoleValues.ADMINISTRATOR,
      UserRoleValues.USER,
    ]);
  });
});
